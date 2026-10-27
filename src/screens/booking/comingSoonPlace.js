// The place for "Coming soon to <city>" from a booking address (useAddressForm
// toPayload): the city the map named - or the area / state, or the pincode
// when the map didn't name one. City-level details only (as the web).
export const comingSoonPlace = address => ({
  city:
    [address.city, address.locality, address.state]
      .map(part => part?.trim())
      .find(Boolean) || `PIN ${address.pincode}`,
  locality: address.locality || null,
  state: address.state || null,
  pincode: address.pincode || null,
});
