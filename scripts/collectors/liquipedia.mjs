const text=s=>String(s??'').replace(/<[^>]+>/g,'').replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&(?:nbsp|amp|quot|apos|lt|gt);/g,m=>({'&nbsp;':' ','&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>'}[m])).replace(/\s+/g,' ').trim();
export function tournamentName(path){
 const parts=String(path).split('/').filter(Boolean).map(p=>decodeURIComponent(p).replaceAll('_',' '));
 return parts.length?parts.join(' '):String(path);
}
export function parseMatchesPage(html,wiki){
 const found=[];
 for(const block of html.split('<div class="match-info">').slice(1)){
  const ts=block.match(/data-timestamp="(\d{10})"/)?.[1];
  if(!ts)continue;
  const start=new Date(Number(ts)*1000).toISOString();
  const opponents=[...block.matchAll(/<span class="name"[^>]*><a href="[^"]+" title="([^"]+)">/g)].map(m=>text(m[1])).filter((v,i,a)=>v&&a.indexOf(v)===i);
  const streams=[...new Set([...block.matchAll(/href="[^"]*Special:Stream\/([^"#]+)"/g)].map(m=>decodeURIComponent(m[1]).replaceAll('_',' ')))];
  const links=[...block.matchAll(/href="([^"#]+)(#[^"]*)?"[^>]*title="([^"]+)"/g)].map(m=>({href:m[1],anchor:m[2]?m[2].slice(1).replaceAll('_',' '):null,title:m[3]}));
  const tournLink=links.find(l=>!l.href.includes('Special:')&&/\/20\d\d\//.test(l.href))||links.find(l=>!l.href.includes('Special:')&&l.title.includes('/'));
  const bo=block.match(/\(Bo(\d+)\)/)?.[1];
  found.push({start,opponents,streams,stage:tournLink?.anchor||null,tournament:tournLink?.title||null,tournamentPath:tournLink?.href||null,bo:bo?Number(bo):null,wiki});
 }
 return found;
}
export function parseTournamentStreams(html){
 const streams=[...new Set([...html.matchAll(/Special:Stream\/([^"<]+)/g)].map(m=>decodeURIComponent(m[1]).replaceAll('_',' ')))];
 const unique=new Map();
 for(const s of streams){
  const at=s.indexOf('/');
  if(at<1)continue;
  const platform=s.slice(0,at).toLowerCase(),channel=s.slice(at+1).trim();
  if(!channel)continue;
  const key=platform+'|'+channel.toLowerCase();
  if(!unique.has(key))unique.set(key,{platform,channel});
 }
 return [...unique.values()];
}
export function streamURL({platform,channel}){
 if(platform==='twitch')return 'https://www.twitch.tv/'+channel.replace(/\s+/g,'_').toLowerCase();
 if(platform==='kick')return 'https://kick.com/'+channel.replace(/\s+/g,'_').toLowerCase();
 if(platform==='youtube')return 'https://www.youtube.com/@'+channel.replace(/\s+/g,'');
 return null;
}
