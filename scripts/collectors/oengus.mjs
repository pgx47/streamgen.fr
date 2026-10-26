export function parseOengusMarathons(data){
 const found=[];
 for(const section of ['live','open','next','upcoming']){
  for(const m of Array.isArray(data?.[section])?data[section]:[]){
   if(!m||!m.id||!m.name||!m.startDate||!m.endDate)continue;
   if(found.some(x=>x.key===m.id))continue;
   found.push({key:m.id,title:String(m.name).slice(0,160),start:new Date(m.startDate).toISOString(),end:new Date(m.endDate).toISOString(),onsite:m.onsite===true,country:m.country||null,language:m.language||null,location:m.location||null});
  }
 }
 return found;
}
