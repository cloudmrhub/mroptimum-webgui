import {AxiosResponse} from "axios";
import {uploadData} from "./data/dataActionCreation";

export const uploadHandlerFactory = (accessToken:string, uploadToken:string,dispatch:any, uploader = uploadData, uploadTarget?:string,)=>{
    return async (file:File, fileAlias:string,
           fileDatabase:string,
           onProgress?:(progress:number)=>void,
           onUploaded?:(res:AxiosResponse,file:File)=>void)=>{
        await dispatch(uploader({file:file,fileAlias:fileAlias, uploadToken,
            accessToken:accessToken,
            onProgress,onUploaded,uploadTarget}))
        return 200;
    }
}
