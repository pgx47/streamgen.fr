export function parseLichessBroadcasts(ndjson){
 const found=[];
 for(const line of String(ndjson).split('\n')){
  const l=line.trim();if(!l)continue;
  let row;try{row=JSON.parse(l)}catch{continue}
  const t=row?.tour;if(!t||!t.id||!t.name||!t.url)continue;
  const dates=Array.isArray(t.dates)?t.dates.filter(Number.isFinite):[];
  if(!dates.length)continue;
  const start=new Date(Math.min(...dates)).toISOString();
  const end=Math.max(...dates)>Math.min(...dates)?new Date(Math.max(...dates)).toISOString():null;
  found.push({key:t.id,title:String(t.name).slice(0,160),start,end,url:t.url.startsWith('http')?t.url:'https://lichess.org'+t.url,location:t.info?.location||null,format:t.info?.format||null,players:t.info?.players||null});
 }
 return found;
}
