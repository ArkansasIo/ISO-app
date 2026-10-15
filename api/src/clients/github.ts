import type {GitHubClient,GitHubRepositoryInfo} from "./contracts.js";

const API="https://api.github.com";

export class GitHubRESTClient implements GitHubClient {
  constructor(private readonly token?: string) {}
  private async request<T>(path:string,init:RequestInit={}):Promise<T>{
    const headers=new Headers(init.headers);
    headers.set("Accept","application/vnd.github+json");
    headers.set("X-GitHub-Api-Version","2022-11-28");
    headers.set("User-Agent","ISO-app/1.0");
    if(this.token) headers.set("Authorization",`Bearer ${this.token}`);
    const response=await fetch(`${API}${path}`,{...init,headers});
    if(!response.ok) throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
    return await response.json() as T;
  }
  async getRepository(owner:string,repo:string):Promise<GitHubRepositoryInfo>{
    const data=await this.request<any>(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`);
    return {owner:data.owner.login,name:data.name,defaultBranch:data.default_branch,private:Boolean(data.private),htmlUrl:data.html_url};
  }
  async searchRepositories(query:string,page=1):Promise<unknown>{
    return this.request(`/search/repositories?q=${encodeURIComponent(query)}&page=${Math.max(1,page)}&per_page=30`);
  }
  async downloadArchive(owner:string,repo:string,ref?:string):Promise<Uint8Array>{
    const path=`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/zipball${ref?`/${encodeURIComponent(ref)}`:""}`;
    const headers=new Headers({Accept:"application/vnd.github+json","User-Agent":"ISO-app/1.0"});
    if(this.token) headers.set("Authorization",`Bearer ${this.token}`);
    const response=await fetch(`${API}${path}`,{headers});
    if(!response.ok) throw new Error(`GitHub archive ${response.status}`);
    return new Uint8Array(await response.arrayBuffer());
  }
  async getAuthenticatedUser():Promise<{id:number;login:string;name:string|null;avatarUrl:string}>{
    const data=await this.request<any>("/user");
    return {id:data.id,login:data.login,name:data.name??null,avatarUrl:data.avatar_url};
  }
}
