import type { EnvVariable } from "../types/EnvVariable.js"

// For Dubug
export class DebugUtil{
    static formatList(envList: EnvVariable[]){
        console.log("===========================")
        envList.forEach(e=>{
            console.log("----------------")
            console.log("name: "+ e.name)
            console.log("requirement: "+ e.requirement)
            console.log("defaultValue: "+ e.defaultValue)
            console.log()
            e.envReference.forEach(r=>{
                console.log(r.fileName + ":" + r.line)
            })
            console.log()
            console.log("----------------")
        })
        console.log("===========================")
    }
}