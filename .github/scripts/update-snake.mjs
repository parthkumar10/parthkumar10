import fs from 'node:fs/promises';
const username='parthkumar10';
const date=process.argv.find(x=>x.startsWith('--date='))?.slice(7)||new Date().toISOString().slice(0,10);
const input=process.argv.find(x=>x.startsWith('--input='))?.slice(8);
let html;
if(input) html=await fs.readFile(input,'utf8');
else {
  const r=await fetch(`https://github.com/users/${username}/contributions?from=${date.slice(0,4)}-01-01&to=${date}`,{signal:AbortSignal.timeout(30000)});
  if(!r.ok)throw Error(`GitHub returned ${r.status}`);
  html=await r.text();
}
const tips=new Map([...html.matchAll(/<tool-tip\b([^>]*)>([\s\S]*?)<\/tool-tip>/g)].map(m=>[m[1].match(/for="([^"]+)"/)?.[1],m[2].replace(/<[^>]*>/g,'').trim()]));
const days=[];
for(const m of html.matchAll(/<td\b[^>]*data-date="[^>]+>/g)){
  const tag=m[0],d=tag.match(/data-date="([^"]+)"/)?.[1],level=Number(tag.match(/data-level="(\d)"/)?.[1]);
  const tip=tips.get(tag.match(/\bid="([^"]+)"/)?.[1])||'';
  const count=tip.startsWith('No contributions')?0:Number(tip.match(/^([\d,]+) contribution/)?.[1]?.replaceAll(',',''));
  if(d<=date&&Number.isInteger(level)&&Number.isFinite(count))days.push({date:d,level,count});
}
if(days.length<7)throw Error('Could not parse public contributions; existing asset retained.');
const end=new Date(date+'T12:00:00Z'),start=new Date(end);
start.setUTCDate(start.getUTCDate()-start.getUTCDay()-25*7);
const data=new Map(days.map(d=>[d.date,d]));
const total=days.filter(d=>new Date(d.date+'T12:00:00Z')>=start).reduce((s,d)=>s+d.count,0);
const colors=['#142235','#155e75','#0e7490','#0ea5e9','#7dd3fc'];
let cells='',labels='';
for(let c=0;c<26;c++)for(let r=0;r<7;r++){
  const d=new Date(start);d.setUTCDate(start.getUTCDate()+c*7+r);
  const key=d.toISOString().slice(0,10),entry=data.get(key);
  if(key<=date)cells+=`<rect x="${60+c*34}" y="${102+r*25}" width="25" height="17" rx="4" fill="${entry?colors[entry.level]:'#101b29'}"><title>${key}: ${entry?entry.count+' contributions':'data unavailable'}</title></rect>`;
  if(r===0&&(c===0||d.getUTCDate()<=7))labels+=`<text x="${60+c*34}" y="83">${d.toLocaleDateString('en',{month:'short',timeZone:'UTC'})}</text>`;
}
const points=[];
for(let c=0;c<26;c++)for(let i=0;i<7;i++)points.push([72.5+c*34,110.5+(c%2?6-i:i)*25]);
const path=points.map((p,i)=>`${i?'L':'M'}${p.join(' ')}`).join(' ');
let snake='';
for(let i=7;i>=0;i--)snake+=`<circle r="${i===0?7:6}" fill="${i===0?'#e0f2fe':'#38bdf8'}" opacity="${1-i*.09}"><animateMotion path="${path}" dur="32s" begin="${-32+i*.12}s" repeatCount="indefinite" calcMode="linear"/></circle>`;
const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="330" viewBox="0 0 1000 330" role="img" aria-labelledby="title desc"><title id="title">Parth Kumar's public contribution trail</title><desc id="desc">Decorative snake traversing actual public contribution levels. ${total} contributions in the displayed period. Snapshot ${date}.</desc><rect x="1" y="1" width="998" height="328" rx="14" fill="#0d1117" stroke="#1e3a5f"/><g font-family="Consolas,monospace"><text x="35" y="40" fill="#7dd3fc" font-size="17">&gt; contribution.trail()</text><text x="965" y="40" fill="#94a3b8" font-size="14" text-anchor="end">${total} PUBLIC CONTRIBUTIONS</text><g fill="#94a3b8" font-size="12">${labels}<text x="22" y="140">M</text><text x="22" y="190">W</text><text x="22" y="240">F</text></g></g>${cells}${snake}<text x="35" y="305" font-family="Consolas,monospace" fill="#94a3b8" font-size="12">@parthkumar10 · Public activity · Snapshot ${date}</text><g transform="translate(792 291)">${colors.map((c,i)=>`<rect x="${i*28}" width="19" height="12" rx="3" fill="${c}"/>`).join('')}</g></svg>`;
await fs.mkdir('assets',{recursive:true});
await fs.writeFile('assets/contribution-snake.svg',svg);
console.log(`Generated real contribution snapshot: ${total} contributions, ${date}.`);
