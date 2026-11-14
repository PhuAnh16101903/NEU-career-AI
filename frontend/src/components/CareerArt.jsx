import { t as tr, useLocale as useUiLanguage } from "../i18n";
import { useId } from "react";

// Original vector artwork. Motion is CSS-driven so pause/reduced-motion also
// freezes the illustration; no external image host or animation library needed.
export default function CareerArt({ compact = false }) {
  useUiLanguage();
  const id = useId();
  return (
    <svg
      className={`career-art ${compact ? "compact-art" : ""}`}
      viewBox="0 0 600 540"
      role="img"
      aria-labelledby={id}
    >
      <title id={id}>
        {tr(
          "Minh họa sinh viên bước lên lộ trình nghề nghiệp cùng hồ sơ CV và kỹ năng",
        )}
      </title>
      <defs>
        <pattern
          id={`${id}-dots`}
          width="24"
          height="24"
          patternUnits="userSpaceOnUse"
        >
          <circle cx="2" cy="2" r="1.4" fill="#072D59" opacity=".12" />
        </pattern>
      </defs>
      <circle cx="310" cy="265" r="205" fill="#c4e8f8" />
      <circle
        cx="310"
        cy="265"
        r="166"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
      />
      <circle
        cx="310"
        cy="265"
        r="230"
        fill="none"
        stroke="#072D59"
        strokeOpacity=".1"
        strokeDasharray="4 10"
      />
      <rect x="30" y="90" width="125" height="145" fill={`url(#${id}-dots)`} />
      <ellipse
        cx="327"
        cy="472"
        rx="218"
        ry="16"
        fill="#072D59"
        opacity=".07"
      />
      <g className="art-steps">
        <path d="M128 472v-62h98v-67h99v-68h100v197Z" fill="#072D59" />
        <path d="M226 410h99m0-67h100" stroke="#5b83ac" strokeWidth="2" />
        <path d="M425 275l43 25v172h-43Z" fill="#164679" />
        <path
          d="M128 410l39-22h59v22m0-67 38-22h61v22m0-68 39-22h61v22"
          fill="#326395"
        />
      </g>
      <g className="art-person">
        <path d="m262 270 39 4-8 70-40 63-23-9 31-71Z" fill="#FD6E88" />
        <path d="m290 275 30-3 20 58 48 15-7 24-68-16-30-50Z" fill="#e34f70" />
        <path d="m231 391 24 11-7 18h-38q-6-10 8-16Z" fill="#072D59" />
        <path d="m380 342 19 5 9 23q-1 12-13 8l-22-14Z" fill="#072D59" />
        <path d="m262 171 37-8 35 27-15 95-65-7-6-65Z" fill="#fff" />
        <path d="m263 178-24 47-35-12-8 14 47 23q12 5 19-9l18-43" fill="#fff" />
        <path
          d="m317 182 24 27 40-43 13 11-43 61q-9 9-18 0l-26-23"
          fill="#fff"
        />
        <path d="m379 167 9-17 14-2 2 9-11 21Z" fill="#d69a87" />
        <path d="m202 212-15-12-14 2 3 10 20 15Z" fill="#d69a87" />
        <path d="m278 148-1 24 18 7 9-20-7-15Z" fill="#c48373" />
        <ellipse
          cx="292"
          cy="132"
          rx="24"
          ry="30"
          transform="rotate(14 292 132)"
          fill="#e1a895"
        />
        <path
          d="M269 139q-18-37 12-46 32-10 41 16l-11 16-4-18q-5 22-24 15l-4 23Z"
          fill="#072D59"
        />
        <path d="m283 193-8 71" stroke="#c3ddeb" strokeWidth="2" />
        <path d="m257 191-17 36-12-7 15-38q9-13 20-6" fill="#7eb4d2" />
        <path d="m248 194-15 46-23-6 12-44q8-15 26 4Z" fill="#072D59" />
      </g>
      <g className="art-cv">
        <rect
          x="45"
          y="250"
          width="145"
          height="162"
          rx="16"
          fill="#fff"
          stroke="#bad9e9"
        />
        <rect x="61" y="267" width="34" height="34" rx="10" fill="#DBF2FC" />
        <circle cx="78" cy="278" r="6" fill="#072D59" />
        <path d="M68 294q10-17 20 0" fill="#072D59" />
        <text x="105" y="283" fontSize="15" fontWeight="700" fill="#072D59">
          {tr("YOUR CV")}
        </text>
        <rect x="105" y="293" width="58" height="4" rx="2" fill="#dae6ee" />
        <rect x="63" y="321" width="108" height="5" rx="2.5" fill="#bccfdf" />
        <rect x="63" y="336" width="92" height="5" rx="2.5" fill="#dce6ef" />
        <rect x="63" y="351" width="103" height="5" rx="2.5" fill="#dce6ef" />
        <rect x="63" y="372" width="46" height="19" rx="6" fill="#DBF2FC" />
        <rect x="116" y="372" width="51" height="19" rx="6" fill="#ffe4eb" />
        <path
          className="art-scan"
          d="M56 310h122"
          stroke="#FD6E88"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </g>
      <g className="art-goal">
        <rect
          x="393"
          y="86"
          width="165"
          height="93"
          rx="16"
          fill="#fff"
          stroke="#bad9e9"
        />
        <circle cx="421" cy="115" r="14" fill="#ffe4eb" />
        <path
          d="m414 115 5 5 9-10"
          fill="none"
          stroke="#072D59"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <text x="445" y="119" fontSize="13" fontWeight="700" fill="#072D59">
          {tr("NEXT CHAPTER")}
        </text>
        <rect x="412" y="142" width="124" height="7" rx="3.5" fill="#DBF2FC" />
        <rect
          className="art-progress"
          x="412"
          y="142"
          width="94"
          height="7"
          rx="3.5"
          fill="#FD6E88"
        />
      </g>
      <g className="art-star" fill="#FD6E88">
        <path d="m145 96 7 20 21 7-21 7-7 21-7-21-21-7 21-7Z" />
        <path d="m501 339 5 14 14 5-14 5-5 14-5-14-14-5 14-5Z" />
      </g>
      <g className="art-arrow">
        <path
          d="M380 229q38-19 54-46"
          fill="none"
          stroke="#072D59"
          strokeWidth="2"
          strokeDasharray="5 6"
        />
        <path
          d="m424 185 13-8 1 16"
          fill="none"
          stroke="#072D59"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
