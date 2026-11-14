export default function WorkspaceArt({kind='cv'}) {
 const labels={cv:'CV',matching:'JD',interview:'STAR',courses:'NEU',admin:'NEU',enterprise:'HR',student:'CV'};
 return <div className={`workspace-art art-${kind}`} aria-hidden="true">
  <div className="art-plane plane-back"/><div className="art-plane plane-mid"/>
  <div className="art-plane plane-front"><span className="art-stamp">{labels[kind]||'NEU'}</span><i/><i/><i/><div className="art-chips"><b/><b/><b/></div></div>
  <div className="art-orbit"><span/></div>
 </div>;
}
