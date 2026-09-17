import {useId} from 'react';

/** Decorative rank art; the surrounding podium supplies the accessible rank. */
export function RankMedal({rank}:{rank:number}){
  const id=useId().replace(/:/g,'');
  const gold=rank===1,silver=rank===2;
  const [light,mid,dark,ink]=gold?['#fff4bd','#e5b444','#8a5718','#714210']:silver?['#f4fbff','#acc3d6','#526c85','#304b66']:['#ffe0ba','#c68c61','#79472e','#633720'];
  const outline=silver?'M80 12L94 22 113 20 122 36 141 43 138 62 150 77 139 94 140 114 120 123 111 139 92 137 80 148 68 137 49 139 40 123 20 114 21 94 10 77 22 62 19 43 38 36 47 20 66 22Z':'M80 18A60 60 0 1 1 80 138A60 60 0 1 1 80 18Z';
  return <svg className="rank-medal-art" viewBox="0 0 160 180" aria-hidden="true" focusable="false">
    <defs><linearGradient id={id+'metal'} x2="1" y2="1"><stop stopColor={light}/><stop offset=".22" stopColor={mid}/><stop offset=".43" stopColor={light}/><stop offset=".68" stopColor={mid}/><stop offset="1" stopColor={dark}/></linearGradient><radialGradient id={id+'face'} cx=".35" cy=".22" r=".85"><stop stopColor={light}/><stop offset=".6" stopColor={mid}/><stop offset="1" stopColor={dark}/></radialGradient><filter id={id+'relief'} x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="0" dy="2" stdDeviation="1.3" floodColor={dark} floodOpacity=".35"/></filter></defs>
    <ellipse cx="80" cy="165" rx="42" ry="5" fill="#21362d16"/>
    <path d="M46 122L35 168 60 157 75 173 85 130M114 122L125 168 100 157 85 173 75 130" fill={silver?'#68859e':gold?'#4b7654':'#9b6752'} stroke={light}/>
    {gold&&<g fill={`url(#${id}metal)`} stroke={dark} strokeWidth=".8">{[false,true].map(flip=><g key={String(flip)} transform={flip?'translate(160 0) scale(-1 1)':''}><path d="M44 139Q-1 110 23 48" fill="none" strokeWidth="2"/>{[0,1,2,3,4,5].map(i=><path key={i} d="M0 0Q-16 -3 -14 -17Q-1 -14 0 0Q12 -5 14 -17Q0 -16 0 0Z" transform={`translate(${22+i*i*.6} ${56+i*14}) rotate(${i*8-25})`}/>)}</g>)}</g>}
    <g filter={`url(#${id}relief)`}><path d={outline} fill={dark} transform="translate(0 3)"/><path d={outline} fill={`url(#${id}metal)`} stroke={light} strokeWidth="1.5"/><circle cx="80" cy="78" r="51" fill={dark} stroke={light}/><circle cx="80" cy="78" r="47" fill={`url(#${id}face)`}/><circle cx="80" cy="78" r="43" fill="none" stroke={light} strokeWidth=".8"/>
    {Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return <circle key={i} cx={80+55*Math.sin(a)} cy={78+55*Math.cos(a)} r="1" fill={light}/>;})}
    {gold?<g fill={`url(#${id}metal)`} stroke={dark}><path d="M49 31L44 7 64 20 80 1 96 20 116 7 111 31Z"/><path d="M54 29H106" stroke={light}/><path d="M80 6L85 15 80 24 75 15Z" fill="#65b69a" stroke={light}/></g>:silver?<path d="M80 5L87 17 80 29 73 17Z" fill="#dceefb" stroke={dark}/>:null}
    <text x="80" y="101" textAnchor="middle" fontFamily="Georgia,serif" fontSize="68" fontWeight="700" fill={ink} stroke={light} strokeWidth=".6">{rank}</text>
    <path d="M49 114Q80 124 111 114" fill="none" stroke={light} strokeWidth="2"/>
    <path d="M36 134Q80 144 124 134L120 153Q80 164 40 153Z" fill={`url(#${id}metal)`} stroke={dark}/>
    <text x="80" y="152" textAnchor="middle" fontFamily="Arial,sans-serif" fontSize="10" fontWeight="700" letterSpacing="2" fill={ink}>{gold?'GOLD':silver?'SILVER':'BRONZE'}</text></g>
  </svg>;
}
