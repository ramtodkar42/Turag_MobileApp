package com.turag.billing

import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClient.BillingResponseCode
import com.android.billingclient.api.BillingClient.ProductType
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.ConsumeParams
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

/**
 * Google Play Billing for the AI Self Inspection fee. Play requires a digital service
 * bought inside an Android app to go through Google Play; an inspector visit and the
 * vehicle token stay on Razorpay. One consumable product, one purchase at a time:
 *   getProduct(id)                -> { productId, title, price, priceMicros, currency }
 *   purchase(id, account, profile) -> [purchase]   once Google's sheet closes
 *   getPurchases()                -> [purchase]    bought and not consumed yet
 *   consume(token)                -> true          after the server has recorded it
 * purchase: { token, orderId, state ('purchased' | 'pending' | 'unknown'), products,
 *             accountId, profileId, acknowledged }
 * A rejection's code: cancelled | already_owned | unavailable | network | busy | error.
 * Purchases that change while no purchase() is waiting (e.g. a pending payment that went
 * through later) are sent as the event PlayBilling_purchasesUpdated { purchases }.
 * Nothing here decides "paid": the server checks every purchase token with Google.
 */
class PlayBillingModule(private val context: ReactApplicationContext) :
  ReactContextBaseJavaModule(context), PurchasesUpdatedListener {

  private val lock = Any()
  private var billing: BillingClient? = null
  private var connecting = false
  private val waitingForConnection = mutableListOf<(Int) -> Unit>()
  private val products = mutableMapOf<String, ProductDetails>()
  private var purchasePromise: Promise? = null

  override fun getName() = "PlayBilling"

  private val client: BillingClient
    get() = synchronized(lock) {
      billing ?: BillingClient.newBuilder(context)
        .setListener(this)
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .enableAutoServiceReconnection()
        .build()
        .also { billing = it }
    }

  /** Runs `then` with the connection's response code once Google Play is connected (or failed). */
  private fun connected(then: (Int) -> Unit) {
    val billingClient = client
    if (billingClient.isReady) {
      then(BillingResponseCode.OK)
      return
    }
    synchronized(lock) {
      waitingForConnection.add(then)
      if (connecting) return
      connecting = true
    }
    billingClient.startConnection(
      object : BillingClientStateListener {
        override fun onBillingSetupFinished(result: BillingResult) = finishConnecting(result.responseCode)

        override fun onBillingServiceDisconnected() = finishConnecting(BillingResponseCode.SERVICE_DISCONNECTED)
      },
    )
  }

  private fun finishConnecting(code: Int) {
    val waiting: List<(Int) -> Unit>
    synchronized(lock) {
      connecting = false
      waiting = waitingForConnection.toList()
      waitingForConnection.clear()
    }
    waiting.forEach { it(code) }
  }

  /** The product as Google Play has it (cached for the purchase). */
  private fun loadProduct(productId: String, done: (ProductDetails) -> Unit, fail: (String, String) -> Unit) {
    connected { code ->
      if (code != BillingResponseCode.OK) {
        fail(errorCode(code), "Google Play billing is not available ($code)")
        return@connected
      }
      val params = QueryProductDetailsParams.newBuilder()
        .setProductList(
          listOf(
            QueryProductDetailsParams.Product.newBuilder()
              .setProductId(productId)
              .setProductType(ProductType.INAPP)
              .build(),
          ),
        )
        .build()
      client.queryProductDetailsAsync(params) { result, details ->
        val found = details.productDetailsList.firstOrNull { it.productId == productId }
        when {
          result.responseCode != BillingResponseCode.OK -> fail(errorCode(result.responseCode), result.debugMessage)
          // Not set up in Play Console, or this app wasn't installed from Google Play.
          found == null -> fail("unavailable", "The product $productId is not available on Google Play")
          else -> {
            synchronized(lock) { products[productId] = found }
            done(found)
          }
        }
      }
    }
  }

  @ReactMethod
  fun getProduct(productId: String, promise: Promise) {
    loadProduct(productId, { promise.resolve(productMap(it)) }, { code, message -> promise.reject(code, message) })
  }

  /**
   * Opens Google's payment sheet. accountId (the Turag user) and profileId (the inspection)
   * go with the purchase, so the server can check whose fee it is.
   */
  @ReactMethod
  fun purchase(productId: String, accountId: String?, profileId: String?, promise: Promise) {
    synchronized(lock) {
      if (purchasePromise != null) {
        promise.reject("busy", "A Google Play purchase is already open")
        return
      }
      purchasePromise = promise
    }
    loadProduct(
      productId,
      { details ->
        val activity = context.currentActivity
        if (activity == null) {
          finishPurchase { it.reject("error", "The app is not in the foreground") }
          return@loadProduct
        }
        val productParams = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(details)
        val offerToken = details.oneTimePurchaseOfferDetailsList?.firstOrNull()?.offerToken
          ?: details.oneTimePurchaseOfferDetails?.offerToken
        if (offerToken != null) productParams.setOfferToken(offerToken)
        val flow = BillingFlowParams.newBuilder().setProductDetailsParamsList(listOf(productParams.build()))
        if (!accountId.isNullOrEmpty()) flow.setObfuscatedAccountId(accountId)
        if (!profileId.isNullOrEmpty()) flow.setObfuscatedProfileId(profileId)
        activity.runOnUiThread {
          val result = client.launchBillingFlow(activity, flow.build())
          if (result.responseCode != BillingResponseCode.OK) {
            finishPurchase { it.reject(errorCode(result.responseCode), result.debugMessage) }
          }
          // OK: the answer comes to onPurchasesUpdated when the sheet closes.
        }
      },
      { code, message -> finishPurchase { it.reject(code, message) } },
    )
  }

  private fun finishPurchase(action: (Promise) -> Unit) {
    val promise = synchronized(lock) { purchasePromise.also { purchasePromise = null } } ?: return
    action(promise)
  }

  override fun onPurchasesUpdated(result: BillingResult, purchases: List<Purchase>?) {
    val list = purchases ?: emptyList()
    val waiting = synchronized(lock) { purchasePromise != null }
    if (waiting) {
      if (result.responseCode == BillingResponseCode.OK) {
        finishPurchase { it.resolve(purchaseArray(list)) }
      } else {
        finishPurchase { it.reject(errorCode(result.responseCode), result.debugMessage) }
      }
      return
    }
    if (result.responseCode == BillingResponseCode.OK && list.isNotEmpty() && context.hasActiveReactInstance()) {
      context.emitDeviceEvent(
        "PlayBilling_purchasesUpdated",
        Arguments.createMap().apply { putArray("purchases", purchaseArray(list)) },
      )
    }
  }

  /** Purchases bought and not consumed yet (e.g. the app closed before the server had one). */
  @ReactMethod
  fun getPurchases(promise: Promise) {
    connected { code ->
      if (code != BillingResponseCode.OK) {
        promise.reject(errorCode(code), "Google Play billing is not available ($code)")
        return@connected
      }
      val params = QueryPurchasesParams.newBuilder().setProductType(ProductType.INAPP).build()
      client.queryPurchasesAsync(params) { result, purchases ->
        if (result.responseCode == BillingResponseCode.OK) {
          promise.resolve(purchaseArray(purchases))
        } else {
          promise.reject(errorCode(result.responseCode), result.debugMessage)
        }
      }
    }
  }

  /** Finishes a purchase the server has recorded, so the fee can be bought again next time. */
  @ReactMethod
  fun consume(token: String, promise: Promise) {
    connected { code ->
      if (code != BillingResponseCode.OK) {
        promise.reject(errorCode(code), "Google Play billing is not available ($code)")
        return@connected
      }
      val params = ConsumeParams.newBuilder().setPurchaseToken(token).build()
      client.consumeAsync(params) { result, _ ->
        when (result.responseCode) {
          // ITEM_NOT_OWNED: already consumed.
          BillingResponseCode.OK, BillingResponseCode.ITEM_NOT_OWNED -> promise.resolve(true)
          else -> promise.reject(errorCode(result.responseCode), result.debugMessage)
        }
      }
    }
  }

  private fun errorCode(code: Int) = when (code) {
    BillingResponseCode.USER_CANCELED -> "cancelled"
    BillingResponseCode.ITEM_ALREADY_OWNED -> "already_owned"
    BillingResponseCode.BILLING_UNAVAILABLE,
    BillingResponseCode.ITEM_UNAVAILABLE,
    BillingResponseCode.FEATURE_NOT_SUPPORTED,
    BillingResponseCode.DEVELOPER_ERROR -> "unavailable"
    BillingResponseCode.SERVICE_UNAVAILABLE,
    BillingResponseCode.SERVICE_DISCONNECTED,
    BillingResponseCode.NETWORK_ERROR -> "network"
    else -> "error"
  }

  private fun purchaseArray(list: List<Purchase>): WritableArray =
    Arguments.createArray().apply {
      list.forEach { purchase ->
        pushMap(
          Arguments.createMap().apply {
            putString("token", purchase.purchaseToken)
            putString("orderId", purchase.orderId)
            putString(
              "state",
              when (purchase.purchaseState) {
                Purchase.PurchaseState.PURCHASED -> "purchased"
                Purchase.PurchaseState.PENDING -> "pending"
                else -> "unknown"
              },
            )
            putArray("products", Arguments.createArray().apply { purchase.products.forEach { pushString(it) } })
            putString("accountId", purchase.accountIdentifiers?.obfuscatedAccountId)
            putString("profileId", purchase.accountIdentifiers?.obfuscatedProfileId)
            putBoolean("acknowledged", purchase.isAcknowledged)
          },
        )
      }
    }

  private fun productMap(details: ProductDetails): WritableMap =
    Arguments.createMap().apply {
      val offer = details.oneTimePurchaseOfferDetails
      putString("productId", details.productId)
      putString("title", details.name)
      putString("price", offer?.formattedPrice)
      putDouble("priceMicros", (offer?.priceAmountMicros ?: 0L).toDouble())
      putString("currency", offer?.priceCurrencyCode)
    }

  // Required by NativeEventEmitter (the event is simply always sent).
  @ReactMethod
  fun addListener(eventName: String) {}

  @ReactMethod
  fun removeListeners(count: Int) {}

  override fun invalidate() {
    finishPurchase { it.reject("error", "The app closed") }
    synchronized(lock) {
      billing?.endConnection()
      billing = null
      products.clear()
    }
    super.invalidate()
  }
}
