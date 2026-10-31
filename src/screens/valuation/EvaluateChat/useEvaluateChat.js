import { useCallback, useEffect, useRef, useState } from 'react';
import {
  confirmVehicle,
  estimateValuation,
  proposeVehicle,
} from '../../../api/services/valuation.api';
import { beginSelfInspection } from '../../../api/services/inspector.api';
import { supportsSelfInspection } from '../../../api/mappers/valuation';
import { formatNumber } from '../../../utils/format';
import { formatRegNumber } from '../../../utils/validators';
import { ROUTES } from '../../../navigation/routes';
import { tNow } from '../../../i18n';
import { ACCIDENT_OPTIONS } from '../constants';
import { STEPS } from './steps';

// A reply shows "typing" at least this long, so the chat reads naturally.
export const TYPING_MS = 600;

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let counter = 0;
const nextId = () => `m${Date.now()}_${(counter += 1)}`;

// The Evaluate flow as a guided chat with TURAG.AI - the same steps and API
// calls as the web's /evaluate: registration number -> "Is this your
// vehicle?" -> instant estimate -> km / owners / accident history -> updated
// estimate -> Save Vehicle / Inspect Vehicle -> self-inspection or an inspector.
// messages: oldest first - { id, role: 'bot' | 'user', kind, ... }:
//   text { text }  vehicle { vehicle }  estimate { vehicle, valuation, label, description }
//   selfIntro {}
// step: what the user answers next (see steps.js); null while TURAG.AI replies.
export default function useEvaluateChat({ navigation }) {
  const [messages, setMessages] = useState([]);
  const [step, setStep] = useState(null);
  const [typing, setTyping] = useState(false);
  const [starting, setStarting] = useState(false);
  // What the user answered so far (vehicle, valuation, condition, ...).
  const data = useRef({});
  // Bumped on Start over / leaving: a reply still on its way is dropped.
  const session = useRef(0);
  // One answer per question: a double tap on a quick reply (or Send) runs it
  // once. Set when an answer starts; cleared when the next question shows.
  const answering = useRef(false);
  const startingSelf = useRef(false);
  useEffect(() => {
    if (step != null) answering.current = false;
  }, [step]);
  // Wraps an answer so only the first tap on a question counts.
  const once = fn => (...args) => {
    if (answering.current) return;
    answering.current = true;
    fn(...args);
  };

  const push = useCallback(list => setMessages(prev => [...prev, ...list.map(m => ({ id: nextId(), ...m }))]), []);
  const bot = useCallback((...list) => push(list.map(m => ({ role: 'bot', kind: 'text', ...m }))), [push]);
  const user = useCallback(text => push([{ role: 'user', kind: 'text', text }]), [push]);

  // TURAG.AI's turn: typing dots while `work` runs (and at least TYPING_MS),
  // then `reply(result)`; on failure `fail(error)`. Nothing if the chat restarted.
  const turn = useCallback(async (work, reply, fail) => {
    const id = session.current;
    setStep(null);
    setTyping(true);
    let result;
    let error = null;
    try {
      [result] = await Promise.all([work(), wait(TYPING_MS)]);
    } catch (e) {
      error = e;
    }
    if (id !== session.current) {
      return;
    }
    setTyping(false);
    if (error) {
      fail(error);
    } else {
      reply(result);
    }
  }, []);

  const start = useCallback(() => {
    session.current += 1;
    data.current = {};
    setMessages([]);
    setStarting(false);
    turn(
      async () => null,
      () => {
        bot({ text: tNow('valuation.chat.greeting') }, { text: tNow('valuation.chat.askReg') });
        setStep(STEPS.REG);
      },
    );
  }, [bot, turn]);

  useEffect(() => {
    start();
    return () => {
      session.current += 1;
    };
  }, [start]);

  // 1. The registration number -> the registry's vehicle.
  const submitReg = once(plate => {
    user(formatRegNumber(plate));
    turn(
      () => proposeVehicle(plate),
      vehicle => {
        data.current = { proposal: vehicle };
        push([{ role: 'bot', kind: 'vehicle', vehicle }]);
        setStep(STEPS.CONFIRM);
      },
      e => {
        bot({ text: e.message || tNow('valuation.evaluate.notFound') }, { text: tNow('valuation.chat.tryAgainReg') });
        setStep(STEPS.REG);
      },
    );
  });

  // 2. "Is this your vehicle?" Yes saves it and shows the instant estimate.
  const confirm = once(yes => {
    user(tNow(yes ? 'valuation.confirm.yes' : 'valuation.confirm.no'));
    if (!yes) {
      turn(
        async () => null,
        () => {
          bot({ text: tNow('valuation.chat.reenter') });
          setStep(STEPS.REG);
        },
      );
      return;
    }
    turn(
      async () => {
        const vehicle = await confirmVehicle(data.current.proposal.registrationNumber);
        const instant = await estimateValuation({ vehicleId: vehicle.vehicleId, stage: 'INSTANT' });
        return { vehicle, instant };
      },
      ({ vehicle, instant }) => {
        data.current.vehicle = vehicle;
        data.current.valuation = instant.ready ? instant.valuation : null;
        push([
          instant.ready
            ? {
                role: 'bot',
                kind: 'estimate',
                vehicle,
                valuation: instant.valuation,
                description: tNow('valuation.details.priceNote'),
              }
            : { role: 'bot', kind: 'text', text: tNow('valuation.details.notReady') },
          { role: 'bot', kind: 'text', text: tNow('valuation.chat.askKm') },
        ]);
        setStep(STEPS.KM);
      },
      e => {
        bot({ text: e.message || tNow('valuation.confirm.error') });
        setStep(STEPS.CONFIRM);
      },
    );
  });

  // 3. Km driven, number of owners, accident history.
  const submitKm = once(km => {
    data.current.odometerKm = km;
    user(tNow('valuation.chat.kmAnswer', { km: formatNumber(String(km)) }));
    turn(
      async () => null,
      () => {
        bot({ text: tNow('valuation.chat.askOwners') });
        setStep(STEPS.OWNERS);
      },
    );
  });

  const submitOwners = once(count => {
    data.current.ownerCount = count;
    user(tNow('valuation.chat.ownersAnswer', { count }));
    turn(
      async () => null,
      () => {
        bot({ text: tNow('valuation.chat.askAccident') });
        setStep(STEPS.ACCIDENT);
      },
    );
  });

  // 4. The accident answer -> the updated (declared) estimate. When the
  // backend has none yet, the instant one is kept (as the web does).
  const pickAccident = once(value => {
    const option = ACCIDENT_OPTIONS.find(o => o.value === value);
    user(tNow(option.labelKey));
    const { vehicle, odometerKm, ownerCount } = data.current;
    const condition = {
      odometerKm,
      ownerCount,
      accident: option.value,
      condition: option.condition,
      bodySeverity: option.bodySeverity,
    };
    turn(
      () =>
        estimateValuation({
          vehicleId: vehicle.vehicleId,
          stage: 'DECLARED',
          odometerKm,
          ownerCount,
          condition: option.condition,
        }),
      declared => {
        const instant = data.current.valuation;
        const valuation = declared.ready ? declared.valuation : instant;
        data.current.condition = condition;
        data.current.valuation = valuation;
        let description = tNow('valuation.estimate.noValueNote');
        if (valuation?.estimatedValue != null) {
          description = tNow(declared.ready ? 'valuation.estimate.declaredNote' : 'valuation.estimate.instantNote');
        }
        push([
          {
            role: 'bot',
            kind: 'estimate',
            vehicle,
            valuation,
            label: declared.ready ? tNow('valuation.estimate.updatedLabel') : undefined,
            description,
          },
          { role: 'bot', kind: 'text', text: tNow('valuation.estimate.verifyNote') },
        ]);
        setStep(STEPS.RESULT);
      },
      e => {
        bot({ text: e.message || tNow('valuation.condition.estimateError') });
        setStep(STEPS.ACCIDENT);
      },
    );
  });

  // 5. Inspect Vehicle -> self-inspection or an inspector.
  const inspect = once(() => {
    user(tNow('valuation.estimate.inspect'));
    turn(
      async () => null,
      () => {
        const self = supportsSelfInspection(data.current.vehicle);
        bot({ text: tNow(self ? 'valuation.chat.howVerify' : 'valuation.self.carsOnly') });
        setStep(STEPS.MODE);
      },
    );
  });

  const chooseSelf = once(() => {
    user(tNow('valuation.mode.self'));
    turn(
      async () => null,
      () => {
        push([
          { role: 'bot', kind: 'text', text: tNow('valuation.chat.selfIntro') },
          { role: 'bot', kind: 'selfIntro' },
        ]);
        setStep(STEPS.SELF);
      },
    );
  });

  // Appoint an inspector: the booking form (time + address), as the web.
  const chooseInspector = once(() => {
    user(tNow('valuation.mode.inspector'));
    const { vehicle, valuation } = data.current;
    turn(
      async () => null,
      () => {
        bot({ text: tNow('valuation.chat.bookInspector') });
        setStep(STEPS.MODE);
        navigation.navigate(ROUTES.BOOK_APPOINTMENT, { vehicle, valuation });
      },
    );
  });

  // Start self-inspection: creates it once, then the step-by-step checklist.
  // consent: the inspection-consent box under the button (ticked to get here).
  const startSelf = async consent => {
    if (startingSelf.current) return;
    startingSelf.current = true;
    const id = session.current;
    const { vehicle, valuation } = data.current;
    setStarting(true);
    try {
      if (!data.current.inspectionId) {
        const created = await beginSelfInspection({
          vehicleId: vehicle.vehicleId,
          category: vehicle.category,
          consent,
        });
        data.current.inspectionId = created.inspectionId;
      }
      if (id === session.current) {
        navigation.navigate(ROUTES.SELF_INSPECTION, {
          inspectionId: data.current.inspectionId,
          vehicle,
          valuation,
        });
      }
    } catch (e) {
      if (id === session.current) {
        bot({ text: e.message || tNow('valuation.self.startError') });
      }
    } finally {
      startingSelf.current = false;
      if (id === session.current) {
        setStarting(false);
      }
    }
  };

  return {
    messages,
    step,
    typing,
    starting,
    vehicle: data.current.vehicle,
    valuation: data.current.valuation,
    canSelfInspect: supportsSelfInspection(data.current.vehicle),
    restart: start,
    submitReg,
    confirm,
    submitKm,
    submitOwners,
    pickAccident,
    inspect,
    chooseSelf,
    chooseInspector,
    startSelf,
  };
}
