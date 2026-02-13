import { db } from "@/database/monogatari-db";
import { Dexie } from "dexie";
import { exportDB, ExportOptions, ExportProgress, ImportOptions } from "dexie-export-import";

declare const self: Worker;

type WorkerRequest =
    | {
          type: "export";
          payload?: {
              options?: ExportOptions;
          };
      }
    | {
          type: "import";
          payload: {
              blob: Blob;
              replace: boolean;
              options?: ImportOptions;
          };
      };

export type WorkerResponse =
    | { type: "progress"; payload: ExportProgress }
    | { type: "exportDone"; payload: Blob }
    | { type: "importDone"; payload: null }
    | { type: "error"; payload: string };

self.onmessage = async (event) => {
    const { type, payload }: WorkerRequest = event.data;

    if (type === "export") {
        const exportOptions: ExportOptions = {
            ...payload?.options,
            progressCallback: (progress) => {
                self.postMessage({
                    type: "progress",
                    payload: progress
                } satisfies WorkerResponse);
                return true;
            }
        };

        try {
            const blob = await exportDB(db, exportOptions);
            self.postMessage({
                type: "exportDone",
                payload: blob
            } satisfies WorkerResponse);
        } catch (error) {
            self.postMessage({
                type: "error",
                payload: error instanceof Error ? error.message : "Unknown import error"
            } satisfies WorkerResponse);
            return;
        }
    } else if (type === "import") {
        const importOptions: ImportOptions = {
            ...payload?.options,
            progressCallback: (progress) => {
                self.postMessage({
                    type: "progress",
                    payload: progress
                } satisfies WorkerResponse);
                return true;
            }
        };

        try {
            if (payload.replace) {
                await Dexie.import(payload.blob, importOptions);
            } else {
                await db.import(payload.blob, importOptions);
            }
        } catch (error) {
            self.postMessage({
                type: "error",
                payload: error instanceof Error ? error.message : "Unknown import error"
            } satisfies WorkerResponse);
        }

        self.postMessage({
            type: "importDone",
            payload: null
        } satisfies WorkerResponse);
    }
};
