import { useId } from 'react';
import type { BadgeSeriesId } from '../lib/achievements';
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
  return (
    <svg
      className={`badge-art ${locked ? 'badge-art-locked' : ''}`}
      viewBox="0 0 200 220"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={id('rim')} x1="0" y1="0" x2="1" y2="1">
          <stop stopColor={light} />
          <stop offset=".23" stopColor={metal} />
          <stop offset=".48" stopColor={light} />
          <stop offset=".7" stopColor={metal} />
          <stop offset="1" stopColor={dark} />
        </linearGradient>
        <linearGradient id={id('sea')} x2="0" y2="1">
          <stop stopColor={sky} />
          <stop offset="1" stopColor={sea} />
        </linearGradient>
        <radialGradient id={id('gleam')} cx=".3" cy=".15" r=".9">
          <stop stopColor="white" stopOpacity=".55" />
          <stop offset=".5" stopColor="white" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id('clip')}>
          <circle cx="100" cy="98" r="73" />
        </clipPath>
      </defs>
      <ellipse cx="100" cy="192" rx="65" ry="9" fill="#152d4620" />
      {tier >= 2 && (
        <g fill={metal} stroke={dark} strokeWidth="1">
          {[false, true].map((flip) => (
            <g
              key={String(flip)}
              transform={flip ? 'translate(200 0) scale(-1 1)' : ''}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <ellipse
                  key={n}
                  cx={27 - n * 0.9}
                  cy={77 + n * 17}
                  rx="6"
                  ry="13"
                  transform={`rotate(${-38 + n * 6} ${27 - n * 0.9} ${77 + n * 17})`}
                />
              ))}
            </g>
          ))}
        </g>
      )}
      <circle cx="100" cy="100" r="87" fill={dark} />
      <circle
        cx="100"
        cy="96"
        r="86"
        fill={`url(#${id('rim')})`}
        stroke={light}
        strokeWidth="1.5"
      />
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
          stroke="#264e60"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        >
          {series === 'voyage' && (
            <>
              <path
                d="M47 124H152L132 148H69Z"
                fill={tier >= 2 ? '#dbae55' : '#c78959'}
              />
              <path d="M99 48V124" stroke="#ffe7ab" strokeWidth="5" />
              <path d="M91 58L54 117H91Z" fill="#fff8dc" />
              <path
                d="M106 60L146 112H106Z"
                fill={tier >= 3 ? '#b3f0d3' : '#a8dfec'}
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
                fill={
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
              <ellipse cx="100" cy="126" rx="53" ry="26" fill="#fff3d3" />
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
              <path d="M57 93H144V146H57Z" fill="#fff2d7" />
              <path
                d="M57 95L100 127 144 95M57 146L84 121M144 146L117 121"
                fill="none"
              />
              <path
                d="M100 109C54 86 75 55 100 78C126 54 147 85 100 109Z"
                fill={tier >= 3 ? '#a2deca' : '#eaa499'}
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
              <circle cx="100" cy="111" r="10" fill="#fff0b8" />
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
      <path
        d="M36 167L25 186 52 183 57 198 72 177M164 167L175 186 148 183 143 198 128 177"
        fill={dark}
      />
      <path
        d="M49 166Q100 182 151 166L146 189Q100 205 54 189Z"
        fill={`url(#${id('rim')})`}
        stroke={dark}
        strokeWidth="1.5"
      />
      <g fill={dark}>
        {Array.from({ length: tier + 1 }, (_, i) => (
          <path
            key={i}
            d={star}
            transform={`translate(${100 + (i - tier / 2) * 15} 184) scale(.65)`}
          />
        ))}
      </g>
      {tier === 4 && (
        <g fill="#fff9e8" stroke="#b7a6c6" strokeWidth="1">
          <path d="M100 0L106 10 100 21 94 10Z" />
          <path d="M177 33L181 40 177 47 173 40Z" />
        </g>
      )}
    </svg>
  );
}
