import {config} from "../config.js";
import type {WorkerClient} from "./contracts.js";

export class HTTPWorkerClient implements WorkerClient {
  async submit(input:{kind:"build"|"run"|"test";projectId:string;language:string;entrypoint:string;timeoutSeconds:number}){
    if(!config.WORKER_URL) throw new Error("WORKER_URL is not configured");
    const response=await fetch(`${config.WORKER_URL.replace(/\/$/,"")}/v1/jobs`,{method:"POST",headers:{"content-type":"application/json",...(config.WORKER_SHARED_SECRET?{"x-worker-secret":config.WORKER_SHARED_SECRET}: {})},body:JSON.stringify(input)});
    if(!response.ok)throw new Error(`Worker rejected request: ${response.status}`);
    return await response.json() as {jobId:string;status:"queued"|"running"};
  }
  async getStatus(jobId:string){
    if(!config.WORKER_URL) throw new Error("WORKER_URL is not configured");
    const response=await fetch(`${config.WORKER_URL.replace(/\/$/,"")}/v1/jobs/${encodeURIComponent(jobId)}`,{headers:{...(config.WORKER_SHARED_SECRET?{"x-worker-secret":config.WORKER_SHARED_SECRET}: {})}});
    if(!response.ok)throw new Error(`Worker status request failed: ${response.status}`);
    return await response.json() as {status:string;stdout:string;stderr:string};
  }
}
