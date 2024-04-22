import {AxiosResponse} from "axios";
import {uploadData} from "./data/dataActionCreation";

export const uploadHandlerFactory = (accessToken:string, dispatch:any, uploader = uploadData, uploadTarget?:string,)=>{
    return async (file:File, fileAlias:string,
           fileDatabase:string,
           onProgress?:(progress:number)=>void,
           onUploaded?:(res:AxiosResponse,file:File)=>void)=>{
        let result = await dispatch(uploader({file:file,fileAlias:fileAlias,
            accessToken:accessToken,
            onProgress,onUploaded,uploadTarget}))
        // console.log(result);
        return result.payload.code;
    }
}
