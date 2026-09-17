import { useId } from 'react';
import {BADGE_SERIES,type BadgeSeriesId} from '../lib/achievements';
const frameShapes=[
  'M100 10A88 88 0 1 1 100 186A88 88 0 1 1 100 10Z',
  'M100 0L123 16 151 15 164 40 189 54 184 83 198 101 182 125 182 149 157 161 139 185 111 180 100 196 89 180 61 185 43 161 18 149 18 125 2 101 16 83 11 54 36 40 49 15 77 16Z',
  'M100 0L115 16 139 6 145 26 169 23 171 44 197 51 191 88 199 107 184 146 158 173 100 198 42 173 16 146 1 107 9 88 3 51 29 44 31 23 55 26 61 6 85 16Z',
  'M100 -8L137 17 161 17 184 48 184 71 204 98 184 125 184 148 153 177 130 177 100 201 70 177 47 177 16 148 16 125 -4 98 16 71 16 48 39 17 63 17Z',
  'M100 -10L113 8 132 -1 143 19 165 14 170 37 193 41 189 66 208 81 196 102 206 124 185 137 186 161 162 164 148 187 123 181 100 202 77 181 52 187 38 164 14 161 15 137 -6 124 4 102 -8 81 11 66 7 41 30 37 35 14 57 19 68 -1 87 8Z',
];
const metals = [
  ['#fff0d0', '#c18450', '#71442c'],
  ['#ffffff', '#b3c9dc', '#526d88'],
  ['#fff7bd', '#e6b944', '#90611b'],
  ['#ddffe7', '#43b9a0', '#196f69'],
  ['#ffffff', '#bcc6f1', '#7f759f'],
];
const seas = {
  voyage: ['#173d63', '#75d4da'],
  exercise: ['#374d42', '#a8d7a0'],
  steps: ['#174967', '#9adddd'],
  meal: ['#395d4b', '#d4eaa1'],
  medicine: ['#564773', '#d9b9d6'],
  balance: ['#39456d', '#bbcde7'],
};
const star = 'M0 -7 2 -2 7 -2 3 1 5 7 0 3 -5 7 -3 1 -7 -2 -2 -2Z';
const tierBackgrounds = [
  ['#593d30', '#ad7650', '#ebbd83'],
  ['#34495f', '#819fb8', '#dcecf5'],
  ['#664819', '#ba8d35', '#ffe29a'],
  ['#124b45', '#319b82', '#aff0ca'],
  ['#51477b', '#7789c5', '#a7e7df'],
];
// Each family grows its own scenery; levels change the composition as well as metal.
function CollectionScene({series,tier}:{series:BadgeSeriesId;tier:number}){
  if(tier===0)return null;
  return <g strokeLinejoin="round" strokeLinecap="round">
    {tier>=3&&<><path d="M25 91Q64 18 107 51T184 38L180 65Q136 92 105 68T25 113Z" fill={tier===4?'#bcafff':'#6bf0bb'} opacity=".22"/><path d="M24 80Q70 21 109 60T180 49" fill="none" stroke="#d7fff1" strokeWidth="2" opacity=".65"/></>}
    {series==='voyage'&&<><path d="M21 126L38 106 51 110 65 132M130 135L151 106 175 119 186 139" fill="#244e60" stroke="#85cab9" strokeWidth="1"/>{tier>=2&&<g stroke="#285065" strokeWidth="1.5"><path d="M145 112L148 73H159L163 119" fill="#fff3d1"/><path d="M146 73H162L154 63Z" fill="#d8ad54"/><path d="M149 83H159M149 95H160" stroke="#76b6af"/><path d="M153 68V60" stroke="#f9dfa0"/></g>}{tier>=3&&<path d="M154 72L108 49 115 83Z" fill="#fff2aa" opacity=".2"/>}{tier===4&&<g stroke="#faf3c8" fill="none"><circle cx="100" cy="97" r="64" strokeDasharray="1 12"/><path d="M36 45L49 37 61 45 74 34"/><path d={star} transform="translate(74 34) scale(.6)" fill="#fff3bf"/></g>}</>}
    {series==='exercise'&&<><path d="M20 130L50 83 79 125 124 75 181 134V174H20Z" fill="#326456"/><path d="M108 96L124 75 141 96 126 91Z" fill="#ccebd1"/>{tier>=2&&<path d="M29 156Q73 128 97 151T178 147" fill="none" stroke="#dfc58b" strokeWidth="8"/>}{tier>=3&&[35,159].map(x=><g key={x} fill="#7ad1a1" stroke="#235c49" strokeWidth="1"><path d={`M${x} 130V73M${x-14} 95L${x} 73 ${x+14} 95ZM${x-17} 111L${x} 87 ${x+17} 111Z`}/></g>)}{tier===4&&<path d="M30 58Q63 34 80 48M124 46Q152 30 176 49" stroke="#d2d9ff" strokeWidth="4" fill="none"/>}</>}
    {series==='steps'&&<><path d="M20 119L42 61 80 117 111 46 155 108 180 69V168H20Z" fill="#377e8c"/><path d="M99 66L111 46 126 71 112 62Z" fill="#e8f8e6"/>{tier>=2&&<path d="M39 145Q52 118 80 132M40 150V133M53 140V125M67 139V129" fill="none" stroke="#cbb587" strokeWidth="3"/>}{tier>=3&&<path d="M25 117L32 108 35 126 28 137ZM160 124L166 106 174 115 170 138Z" fill="#6ce6c2" stroke="#d8fff2"/>}{tier===4&&<g fill="#fff5d5" stroke="#d7e7fd" strokeWidth=".8"><path d="M45 52L74 37 106 45 135 30" fill="none"/>{[45,74,106,135].map((x,i)=><path key={x} d={star} transform={`translate(${x} ${[52,37,45,30][i]}) scale(.42)`}/>)}</g>}</>}
    {series==='meal'&&<><path d="M31 150Q44 108 59 142T94 151T132 141T175 153" fill="#72a36e"/>{tier>=2&&<g fill="none" stroke="#a7c89a" strokeWidth="2"><path d="M42 143V65Q100 19 158 65V143M49 141V70Q100 29 151 70V143M42 92H158"/></g>}{tier>=3&&[40,157].map(x=><g key={x} fill="#b5db8d" stroke="#527b55" strokeWidth="1"><path d={`M${x} 128Q${x-13} 111 ${x-12} 94Q${x+8} 99 ${x} 128M${x} 98Q${x+15} 86 ${x+10} 70Q${x-7} 75 ${x} 98`}/></g>)}{tier===4&&[ [46,67],[152,65],[58,146],[144,145] ].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`} fill={i%2?'#f5d1d9':'#fff1be'}>{[0,60,120].map(r=><ellipse key={r} rx="4" ry="9" transform={`rotate(${r})`}/>)}<circle r="3" fill="#e9b75c"/></g>)}</>}
    {series==='medicine'&&<>{tier>=2&&<path d="M100 32Q130 51 156 48V102Q155 151 100 169Q45 150 44 102V48Q73 51 100 32Z" fill="#a993bd" fillOpacity=".3" stroke="#f7e6ba" strokeWidth="2"/>}{tier>=3&&<path d="M48 103Q24 71 36 54Q49 57 56 78M151 103Q175 71 164 54Q150 57 144 78" fill="#d8e7dd" stroke="#f8e8c7" strokeWidth="1.5"/>}{tier===4&&<g fill="#fff2cf"><path d={star} transform="translate(100 44) scale(1.1)"/>{[55,145].map(x=><path key={x} d={star} transform={`translate(${x} 68) scale(.6)`}/>)}</g>}</>}
    {series==='balance'&&<><path d="M23 146Q53 133 74 149T130 148T180 145V175H23Z" fill="#6ba895"/>{tier>=2&&<circle cx="100" cy="101" r="59" fill="none" stroke="#e9cc83" strokeWidth="2"/>}{tier>=3&&<g fill="none" stroke="#b5e7d4" strokeWidth="2"><ellipse cx="100" cy="100" rx="66" ry="34" transform="rotate(-35 100 100)"/><ellipse cx="100" cy="100" rx="66" ry="34" transform="rotate(35 100 100)"/></g>}{tier===4&&[ [100,37],[44,129],[156,129] ].map(([x,y],i)=><g key={i} transform={`translate(${x} ${y})`}><circle r="10" fill="#eef3d3" stroke="#dfbb6b"/><path d={star} transform="scale(.85)" fill="#cb9d3b"/></g>)}</>}
  </g>;
}
export function BadgeArt({
  series,
  tier,
  locked = false,
}: {
  series: BadgeSeriesId;
  tier: number;
  locked?: boolean;
}) {
  const uid = useId().replace(/:/g, ''),
    id = (s: string) => uid + s;
  const [light, metal, dark] = metals[tier],
    [sky, sea] = seas[series];
  const goal=BADGE_SERIES.find(collection=>collection.id===series)!.goals[tier];
  const milestone=series==='steps'?(goal>=1000000?`${goal/1000000}M`:`${goal/1000}K`):String(goal);
  return (
    <svg
      className={`badge-art ${locked ? 'badge-art-locked' : ''}`}
      viewBox="-14 -16 228 242"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id('enamel')} x1="0" y1="0" x2="1" y2="1"><stop stopColor={tier===4?'#ffb2c5':'#fffbe3'}/><stop offset=".3" stopColor={tier===4?'#ffd66b':light}/><stop offset=".55" stopColor={tier===4?'#52d7b0':metal}/><stop offset=".75" stopColor={tier===4?'#72c9f8':light}/><stop offset="1" stopColor={tier===4?'#bb83e9':dark}/></linearGradient>
        <radialGradient id={id('pearl')} cx=".32" cy=".25"><stop stopColor="#fffef1"/><stop offset=".25" stopColor={tier===4?'#ffd4a1':'#f1e5fa'}/><stop offset=".5" stopColor={tier===4?'#f2a2c6':'#e6d9f1'}/><stop offset=".72" stopColor={tier===4?'#99aef4':'#bce8e0'}/><stop offset="1" stopColor={tier===4?'#58d8bc':'#8b83ae'}/></radialGradient>
        <filter id={id('relief')} x="-25%" y="-25%" width="150%" height="155%"><feDropShadow dx="0" dy={tier>=3?'3':'1.5'} stdDeviation="1.2" floodColor="#102e3c" floodOpacity=".55"/></filter>
        <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
          {tier===4?<><stop stopColor="#ffb5cd"/><stop offset=".17" stopColor="#ffe59c"/><stop offset=".34" stopColor="#68dcac"/><stop offset=".5" stopColor="#b1f2f5"/><stop offset=".65" stopColor="#7dbbff"/><stop offset=".82" stopColor="#be91ed"/><stop offset="1" stopColor="#f392bd"/></>:<><stop stopColor={light} /><stop offset=".23" stopColor={metal} /><stop offset=".48" stopColor={light} /><stop offset=".7" stopColor={metal} /><stop offset="1" stopColor={dark} /></>}
        </linearGradient>
        <linearGradient id={id('sea')} x2="0" y2="1">
          <stop stopColor={tierBackgrounds[tier][0]} />
          <stop offset=".55" stopColor={tierBackgrounds[tier][1]} />
          <stop offset="1" stopColor={tierBackgrounds[tier][2]} />
        </linearGradient>
        <radialGradient id={id('rainbowSky')} cx=".8" cy=".25" r=".85"><stop stopColor="#ffc1da" stopOpacity=".8"/><stop offset=".38" stopColor="#f6d898" stopOpacity=".5"/><stop offset=".7" stopColor="#b3a1ed" stopOpacity=".2"/><stop offset="1" stopColor="#83dfd1" stopOpacity="0"/></radialGradient>
        <radialGradient id={id('gleam')} cx=".3" cy=".15" r=".9">
          <stop stopColor="white" stopOpacity=".55" />
          <stop offset=".5" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id('clip')}>
          <circle cx="100" cy="98" r="73" />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="192" rx="65" ry="9" fill="#152d4620" />
      <g filter={`url(#${id('relief')})`}>
        <path d={frameShapes[tier]} fill={dark} transform="translate(0 3)"/>
        <path d={frameShapes[tier]} fill={`url(#${id('rim')})`} stroke={light} strokeWidth="1.8"/>
        <path d={frameShapes[tier]} transform="translate(100 98) scale(.94) translate(-100 -98)" fill="none" stroke={dark} strokeWidth="1"/>
        <circle cx="100" cy="98" r="85" fill="none" stroke={light} strokeWidth="2"/>
        {tier>=2&&[false,true].map(flip=><g key={String(flip)} transform={flip?'translate(200 0) scale(-1 1)':''} fill={`url(#${id('enamel')})`} stroke={dark} strokeWidth=".8"><path d="M25 143Q6 106 26 60" fill="none" stroke={light} strokeWidth="2"/>{[0,1,2,3,4].map(i=><path key={i} d="M0 0Q-17 -2 -16 -16Q-1 -16 0 0Q12 -9 14 -21Q-2 -18 0 0Z" transform={`translate(${23-i*.8} ${67+i*16}) rotate(${i*9-30})`}/>)}</g>)}
        {tier===1&&[0,45,90,135,180,225,270,315].map(a=><path key={a} d="M100 10L105 22 100 29 95 22Z" transform={`rotate(${a} 100 98)`} fill="#e8f5fc" stroke="#6c8eaa"/>)}
        {tier>=2&&<g fill={`url(#${id('enamel')})`} stroke={light} strokeWidth="1"><path d="M72 21L68 1 85 11 100 -5 115 11 132 1 128 21Z"/><path d="M79 19H121" stroke={dark}/><path d="M100 0L104 8 100 15 96 8Z" fill={tier===4?'#fb8cb7':tier===3?'#36cbad':'#fff0a0'}/></g>}
        {tier===4&&[30,60,90,120,150,210,240,270,300,330].map((a,i)=><g key={a} transform={`rotate(${a} 100 98)`}><path d="M100 -1L107 10 100 21 93 10Z" fill={['#f6aa8f','#f8db82','#74dfbb','#75c9ee','#c9a1f1'][i%5]} stroke="#fff4df"/><path d="M100 1V19M95 10H105" stroke="#ffffffa0" strokeWidth=".7"/></g>)}
      </g>
      <circle
        cx="100"
        cy="98"
        r="78"
        fill={dark}
        stroke={light}
        strokeWidth="1"
      />
      <g clipPath={`url(#${id('clip')})`}>
        <circle cx="100" cy="98" r="73" fill={`url(#${id('sea')})`} />
        {tier===4&&<circle cx="100" cy="98" r="73" fill={`url(#${id('rainbowSky')})`}/>}
        <circle
          cx="140"
          cy="57"
          r={tier > 2 ? 18 : 12}
          fill="#ffeaaa"
          opacity=".92"
        />
        <path
          d="M15 137 Q55 112 93 140 T191 126 V183 H10Z"
          fill="#123b57"
          opacity=".25"
        />
        <CollectionScene series={series} tier={tier}/>
        {tier >= 1 && (
          <g fill="#fff5cd" opacity=".8">
            {[
              [54, 54],
              [135, 92],
              [69, 39],
              [151, 119],
            ]
              .slice(0, tier + 1)
              .map(([x, y], i) => (
                <path
                  key={i}
                  d={star}
                  transform={`translate(${x} ${y}) scale(.45)`}
                />
              ))}
          </g>
        )}
        <g
          filter={`url(#${id('relief')})`}
          stroke="#264e60"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {series === 'voyage' && (
            <>
              <path
                d="M47 124H152L132 148H69Z"
                fill={tier >= 2 ? `url(#${id('enamel')})` : '#c78959'}
              />
              <path d="M99 48V124" stroke="#ffe7ab" strokeWidth="5" />
              <path d="M91 58L54 117H91Z" fill={tier>=2?`url(#${id('pearl')})`:'#fff8dc'} />
              {tier>=3&&<><path d="M67 115L85 81M110 70L139 109M62 132H140" stroke="#e8ce85" strokeWidth="1"/><circle cx="81" cy="135" r="3" fill="#22585d"/><circle cx="100" cy="135" r="3" fill="#22585d"/><circle cx="119" cy="135" r="3" fill="#22585d"/></>}
              <path
                d="M106 60L146 112H106Z"
                fill={tier===4?'#8ae6d9':tier >= 3 ? '#b3f0d3' : '#a8dfec'}
              />
              <path d="M112 78L128 103H112" fill="#fffdf0" stroke="none" />
              {tier >= 1 && (
                <path
                  d="M101 48V33L128 40 101 48"
                  fill={tier >= 3 ? '#f2c75c' : '#ed8e75'}
                />
              )}
              <path
                d="M40 149Q55 141 70 149T100 149T130 149T160 149M52 160Q68 153 84 160T116 160T148 160"
                fill="none"
                stroke="#d4f9ef"
              />
              {tier >= 4 && (
                <path
                  d="M49 78Q58 69 68 78Q77 69 86 78"
                  fill="none"
                  stroke="#fff5db"
                />
              )}
            </>
          )}
          {series === 'exercise' && (
            <>
              <path
                d="M60 69L90 60 108 102 150 114Q165 120 158 137H49Q41 128 47 116Z"
                fill={tier>=2?`url(#${id('enamel')})`:
                  ['#dba58c', '#a8d5e6', '#e7b952', '#65c5a7', '#dad1f2'][tier]
                }
              />
              <path d="M52 134H157V145H48Z" fill="#fff7de" />
              <path d="M58 81L83 76 92 96 78 110 53 106Z" fill="#fff5df" />
              <path
                d="M92 97L108 91M98 108L118 103M107 119L130 113"
                stroke="#fff9df"
                strokeWidth="5"
              />
              <path d="M57 151H148" stroke="#f4dfa7" />
              {tier>=3&&<><path d="M52 140H154M54 145L60 138M72 145L78 138M90 145L96 138M108 145L114 138M126 145L132 138M144 145L150 138" stroke="#8d7658" strokeWidth="1"/><path d="M105 119Q130 130 154 124" stroke="#fff2bf" fill="none"/></>}
              {tier >= 2 && (
                <path
                  d={star}
                  transform="translate(71 94) scale(.7)"
                  fill="#efbc47"
                />
              )}
              {tier >= 3 && (
                <path
                  d="M125 92Q143 65 155 67Q153 91 125 92M127 92L149 72"
                  fill="#c9efb3"
                />
              )}
            </>
          )}
          {series === 'steps' && (
            <>
              <path d="M23 137L66 83 96 120 131 65 179 137" fill="#7ac5b1" />
              <path d="M114 89L131 65 148 91 135 86 127 92Z" fill="#fff5dc" />
              <path
                d="M99 171C54 141 133 144 99 119S111 100 118 94"
                fill="none"
                stroke="#ffecbb"
                strokeWidth={tier >= 3 ? 10 : 8}
              />
              <g fill="#c38450" stroke="#fff3c8" strokeWidth="1.5">
                <ellipse
                  cx="83"
                  cy="146"
                  rx="4"
                  ry="7"
                  transform="rotate(-35 83 146)"
                />
                <ellipse
                  cx="97"
                  cy="133"
                  rx="4"
                  ry="7"
                  transform="rotate(35 97 133)"
                />
              </g>
              {tier >= 1 && (
                <path
                  d="M57 97V58L77 65 57 74"
                  fill={tier >= 2 ? '#f3c754' : '#ffbc96'}
                />
              )}
              {tier >= 3 && (
                <>
                  <path
                    d="M28 76Q58 26 94 53"
                    fill="none"
                    stroke="#c8f5da"
                    strokeWidth="5"
                    opacity=".65"
                  />
                  <path
                    d="M30 84Q59 34 96 61"
                    fill="none"
                    stroke="#f1c9f0"
                    strokeWidth="4"
                    opacity=".65"
                  />
                </>
              )}
            </>
          )}
          {series === 'meal' && (
            <>
              <ellipse cx="100" cy="126" rx="53" ry="26" fill={tier>=2?`url(#${id('enamel')})`:'#fff3d3'} />
              <ellipse cx="100" cy="124" rx="42" ry="18" fill="#d8e8d3" />
              <path
                d="M103 123Q91 95 104 65"
                fill="none"
                stroke="#f2f1b9"
                strokeWidth="5"
              />
              <path d="M100 99Q64 101 66 76Q96 73 100 99" fill="#a0d291" />
              <path d="M103 84Q130 87 136 64Q109 59 103 84" fill="#c9e8a0" />
              {tier >= 1 && <circle cx="72" cy="120" r="12" fill="#ed997c" />}
              {tier >= 2 && (
                <g transform="translate(104 62)" fill="#fff4d6">
                  {[0, 72, 144, 216, 288].map((r) => (
                    <ellipse
                      key={r}
                      cx="0"
                      cy="-10"
                      rx="7"
                      ry="11"
                      transform={`rotate(${r})`}
                    />
                  ))}
                  <circle r="7" fill="#f3c85a" />
                </g>
              )}
              {tier >= 3 && (
                <>
                  <path
                    d="M123 124Q121 104 140 99Q150 119 123 124"
                    fill="#80b88d"
                  />
                  <path d="M55 128L42 105M145 133L159 110" stroke="#ffe9ac" />
                </>
              )}
            </>
          )}
          {series === 'medicine' && (
            <>
              <path d="M57 93H144V146H57Z" fill={tier>=2?`url(#${id('pearl')})`:'#fff2d7'} />
              <path
                d="M57 95L100 127 144 95M57 146L84 121M144 146L117 121"
                fill="none"
              />
              <path
                d="M100 109C54 86 75 55 100 78C126 54 147 85 100 109Z"
                fill={tier===4?`url(#${id('enamel')})`:tier >= 3 ? '#a2deca' : '#eaa499'}
              />
              {tier >= 1 && (
                <path
                  d="M88 91L97 99 113 83"
                  fill="none"
                  stroke="#fff9e4"
                  strokeWidth="5"
                />
              )}
              {tier >= 2 && (
                <circle cx="135" cy="137" r="17" fill={metal} stroke={light} />
              )}{' '}
              {tier >= 2 && (
                <path
                  d={star}
                  transform="translate(135 136)"
                  fill="#fff4cb"
                  stroke="none"
                />
              )}
              {tier >= 4 && (
                <path
                  d="M48 78L43 71M148 62L157 57M57 57L54 47"
                  stroke="#fff5da"
                />
              )}
            </>
          )}
          {series === 'balance' && (
            <>
              <path d="M100 145V94" stroke="#ffeeb9" strokeWidth="5" />
              <path
                d="M99 119C43 125 44 76 75 86Q97 92 99 119"
                fill="#83c9b4"
              />
              <path
                d="M101 119C155 125 156 76 125 86Q103 92 101 119"
                fill="#f2ba8c"
              />
              <path
                d="M100 101C58 62 97 40 111 61Q131 78 100 101"
                fill="#e4dfa0"
              />
              <circle cx="100" cy="111" r={tier===4?14:10} fill={tier>=2?`url(#${id('pearl')})`:'#fff0b8'} />
              {tier >= 1 && (
                <path
                  d="M70 149Q100 163 130 149"
                  fill="none"
                  stroke="#fff3d2"
                  strokeWidth="5"
                />
              )}
              {tier >= 3 && (
                <circle
                  cx="100"
                  cy="101"
                  r="56"
                  fill="none"
                  stroke="#f6e9ad"
                  strokeDasharray="2 10"
                />
              )}
            </>
          )}
        </g>
        <circle cx="100" cy="98" r="73" fill={`url(#${id('gleam')})`} />
      </g>
      {tier>=2&&<g fill={tier===4?`url(#${id('pearl')})`:`url(#${id('enamel')})`} stroke={light} strokeWidth=".8">{Array.from({length:tier===4?24:12},(_,i)=>{const a=i*Math.PI*2/(tier===4?24:12);return <circle key={i} cx={100+81*Math.sin(a)} cy={96+81*Math.cos(a)} r={tier===4?2.5:1.5}/>;})}</g>}
      {tier>=3&&<g stroke={light} strokeWidth="1.3">{[0,90,180,270].map((a,i)=><g key={a} fill={tier===4?['#f48dad','#69d9c5','#8faaf4','#f6d16f'][i]:'#8ff2ca'} transform={`rotate(${a} 100 96)`}><path d="M100 10L108 20 100 32 92 20Z"/><path d="M100 10V32M92 20H108" stroke="#ffffffb0" strokeWidth=".6"/></g>)}</g>}
      <circle
        cx="100"
        cy="98"
        r="73"
        fill="none"
        stroke={light}
        strokeWidth="1.5"
      />
      <circle
        cx="100"
        cy="96"
        r="82"
        fill="none"
        stroke={dark}
        strokeWidth="1"
        strokeDasharray="1 5"
        opacity=".7"
      />
      <g filter={`url(#${id('relief')})`}>
        <path d="M39 164L25 188 47 188 52 209 74 194H126L148 209 153 188 175 188 161 164Z" fill={`url(#${id('rim')})`} stroke={dark} strokeWidth="1.5"/>
        <path d="M44 157Q100 164 156 157L160 193Q100 212 40 193Z" fill={sky} stroke={light} strokeWidth="2"/>
        <path d="M49 162Q100 169 151 162L154 189Q100 206 46 189Z" fill="none" stroke={metal} strokeWidth=".8"/>
        <text x="100" y="184" textAnchor="middle" fill="#fff6d8" fontFamily="Georgia,serif" fontSize="28" fontWeight="700" letterSpacing="1">{milestone}</text>
        <text x="100" y="198" textAnchor="middle" fill={tier===4?'#d1fff3':light} fontFamily="Arial,sans-serif" fontSize="8.5" fontWeight="700" letterSpacing="2">{series==='steps'?'STEPS':goal===1?'DAY':'DAYS'}</text>
        {Array.from({length:tier+1},(_,i)=><path key={i} d={star} transform={`translate(${100+(i-tier/2)*12} 216) scale(.42)`} fill={tier===4?['#ec92b1','#e9c261','#65c5aa','#79b6e4','#b697d7'][i]:metal} stroke={dark} strokeWidth=".8"/>)}
      </g>
    </svg>
  );
}
