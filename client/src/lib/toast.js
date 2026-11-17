/**
 * Lazy `toast` with sonner's API surface (success / error / loading / message / dismiss).
 * sonner (and its <Toaster/>) is not in the main bundle: the first toast, or an idle callback
 * after load, mounts the Toaster (components/ui/ToasterHost.jsx) and replays the call.
 * Ids are generated synchronously, so `const id = toast.loading(...)` + `toast.success(.., { id })` works.
 */
let resolveReady;
const ready = new Promise((resolve) => {
  resolveReady = resolve;
});
let mountRequest = null;
let wantsMount = false;

/** Called by ToasterHost once <Toaster/> has subscribed. */
export const markToasterReady = () => resolveReady();

/** ToasterHost registers how to mount itself; a toast fired earlier is remembered. */
export const onToasterMountRequest = (fn) => {
  mountRequest = fn;
  if (wantsMount) fn();
};

const withSonner = (fn) => {
  wantsMount = true;
  mountRequest?.();
  ready
    .then(() => import("sonner"))
    .then((mod) => fn(mod.toast))
    .catch(() => {});
};

let seq = 0;
const call = (method) => (message, opts = {}) => {
  const id = opts.id ?? `apex-toast-${++seq}`;
  withSonner((t) => t[method](message, { ...opts, id }));
  return id;
};

export const toast = Object.assign(call("message"), {
  message: call("message"),
  success: call("success"),
  error: call("error"),
  info: call("info"),
  warning: call("warning"),
  loading: call("loading"),
  dismiss: (id) => withSonner((t) => t.dismiss(id)),
});

export default toast;
