// The four things in Nia's inbox, drawn as what they are (not generic cards): the clinic's bill as a paper receipt,
// the payer's EOB as an envelope, the patient's voicemail as a voice note, and the plan as a document page.
// They're paper / a phone bubble, so they keep their own colours in light and dark. Details are illustrative.
export type ArtifactKind = "receipt" | "mail" | "voice" | "doc";

const BARS = [6, 10, 16, 9, 22, 14, 26, 18, 11, 24, 30, 20, 13, 27, 17, 9, 21, 28, 15, 10, 19, 25, 12, 8, 16, 22, 11, 7];

export default function InboxArtifact({ kind }: { kind: ArtifactKind }) {
  switch (kind) {
    case "receipt":
      return (
        <div className="ia ia-receipt" role="img" aria-label="Bill from Northside Clinic, $1,284">
          <b className="ia-r-head">Northside Clinic</b>
          <small>Emergency dept · Mar 3</small>
          <hr />
          <p><span>ER visit</span><span>1,040.00</span></p>
          <p><span>Lab panel</span><span>164.00</span></p>
          <p><span>Supplies</span><span>80.00</span></p>
          <hr />
          <p className="ia-r-total"><span>TOTAL</span><span>$1,284</span></p>
          <small className="ia-r-due">Out-of-network rate applied</small>
        </div>
      );
    case "mail":
      return (
        <div className="ia ia-mail" role="img" aria-label="Letter from Apex Health Plan: explanation of benefits">
          <i className="ia-m-flap" />
          <span className="ia-m-from"><b>Apex Health Plan</b><small>Explanation of benefits</small></span>
          <span className="ia-m-stamp"><i /></span>
          <span className="ia-m-post" />
          <span className="ia-m-to"><i /><i /><i /></span>
        </div>
      );
    case "voice":
      return (
        <div className="ia ia-voice" role="img" aria-label="Voicemail from the patient, 48 seconds">
          <span className="ia-v-play"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" /></svg></span>
          <span className="ia-v-wave">{BARS.map((h, i) => <i key={i} style={{ height: h }} className={i < 9 ? "on" : undefined} />)}</span>
          <span className="ia-v-meta"><b>Patient</b><small>0:48</small></span>
        </div>
      );
    case "doc":
      return (
        <div className="ia ia-doc" role="img" aria-label="Plan document, 64 pages">
          <i className="ia-d-fold" />
          <b>Plan document</b>
          <small>Coverage rules · 64 pages</small>
          <span className="ia-d-lines"><i /><i /><i /><i /></span>
          <span className="ia-d-sec">§4.3 Emergency care</span>
          <span className="ia-d-lines"><i /><i /><i /></span>
        </div>
      );
  }
}
