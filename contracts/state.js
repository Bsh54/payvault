
const {createPublicClient,http}=require("viem");
const {sepolia}=require("viem/chains");
const cl=createPublicClient({chain:sepolia,transport:http("https://ethereum-sepolia-rpc.publicnode.com")});
const VAULT="0xb3ce25d55ee903184ed4158c69a619e222ec1840";
const COMP="0x8BEE24f6D3F421601BC044667CCD3ADc0CB39288";
const abi=[
 {type:"function",name:"employeeCount",stateMutability:"view",inputs:[{name:"c",type:"address"}],outputs:[{type:"uint256"}]},
 {type:"function",name:"isInitialized",stateMutability:"view",inputs:[{name:"c",type:"address"}],outputs:[{type:"bool"}]},
 {type:"function",name:"sablierStreamId",stateMutability:"view",inputs:[{name:"c",type:"address"}],outputs:[{type:"uint256"}]},
 {type:"function",name:"publicBudget",stateMutability:"view",inputs:[{name:"c",type:"address"}],outputs:[{type:"uint256"}]},
 {type:"function",name:"employees",stateMutability:"view",inputs:[{name:"c",type:"address"}],outputs:[{type:"address[]"}]},
];
(async()=>{
 for(const n of ["employeeCount","isInitialized","sablierStreamId","publicBudget","employees"]){
   try{const r=await cl.readContract({address:VAULT,abi,functionName:n,args:[COMP]});
     console.log(n,"=",Array.isArray(r)?("["+r.join(", ")+"]"):r.toString());}
   catch(e){console.log(n,"ERR",e.shortMessage||e.message);}
 }
})();
