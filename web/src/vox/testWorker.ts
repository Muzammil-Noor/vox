import { runProgram } from "./runProgram";
import type { ToTestWorker, FromTestWorker } from "./testProtocol";

interface WorkerPort {
  postMessage(message: FromTestWorker): void;
  onmessage: ((event: MessageEvent<ToTestWorker>) => void) | null;
}
const port = self as unknown as WorkerPort;

port.onmessage = (event: MessageEvent<ToTestWorker>) => {
  const msg = event.data;
  if (msg.type !== "run") return;

  try {
    const result = runProgram({
      source: msg.source,
      label: msg.label,
      stdin: msg.stdin,
      stepLimit: msg.stepLimit,
    });
    port.postMessage({ type: "result", id: msg.id, result });
  } catch (e) {
    port.postMessage({ type: "crashed", id: msg.id, message: String(e) });
  }
};
