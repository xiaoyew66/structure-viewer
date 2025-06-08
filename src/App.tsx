// src/App.tsx
import React, { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";

const App: React.FC = () => {
  const viewerRef = useRef<HTMLDivElement>(null);
  const [viewer, setViewer] = useState<any>(null);
  const [lastClickedAtom, setLastClickedAtom] = useState<any>(null);

  const [pdbID, setPdbID] = useState("");
  const [representation, setRepresentation] = useState<"cartoon"|"stick"|"sphere">("cartoon");
  const [residueFilter, setResidueFilter] = useState<"all"|"protein"|"water">("all");

  const [showSphereControls, setShowSphereControls] = useState(false);
  const [sizeSelection, setSizeSelection] =
    useState<"all"|"protein"|"water"|"selected">("all");
  const [proteinRadius, setProteinRadius] = useState(0.5);
  const [waterRadius, setWaterRadius] = useState(0.5);
  const [highlightEnabled, setHighlightEnabled] = useState(true);
  const [customExpr, setCustomExpr] = useState("");
  const [showCustomRow, setShowCustomRow] = useState(false);

  const [fileName, setFileName] = useState<string>("");

  // remap columns 18–20 to VAL or TIP
  const remapResNames = (pdbData: string) =>
    pdbData.split("\n").map(line => {
      if ((line.startsWith("ATOM")||line.startsWith("HETATM")) && line.length>=20) {
        const orig3 = line.substr(17,3).trim().toUpperCase();
        const newResn = orig3==="VAL" ? "VAL" : "TIP";
        return line.slice(0,17) + newResn.padEnd(3," ") + line.slice(20);
      }
      return line;
    }).join("\n");

  // uniform layout styles
  const controlRow: CSSProperties = {
    display: "flex",
    alignItems: "center",
    marginBottom: 20
  };
  const labelStyle: CSSProperties = {
    width: 120,
    fontWeight: 500
  };
  const inputFlex: CSSProperties = {
    flex: 1
  };

  // initialize 3Dmol viewer
  useEffect(() => {
    if (!(window as any).$3Dmol) return;
    const v = (window as any).$3Dmol.createViewer(viewerRef.current, { backgroundColor: "#f5f5f5" });
    setViewer(v);
  }, []);

  // restore from sessionStorage once viewer is ready
  useEffect(() => {
    if (!viewer) return;

    const pdb = sessionStorage.getItem("pdbData");
    if (pdb) {
      viewer.clear();
      const mdl = viewer.addModel(pdb, "pdb");
      annotateAtoms(mdl, pdb);
    }

    const fn = sessionStorage.getItem("fileName");
    if (fn) setFileName(fn);

    const r = sessionStorage.getItem("representation");
    if (r==="cartoon"||r==="stick"||r==="sphere") setRepresentation(r as any);

    const f = sessionStorage.getItem("residueFilter");
    if (f==="all"||f==="protein"||f==="water") setResidueFilter(f as any);

    const s = sessionStorage.getItem("sizeSelection");
    if (s==="all"||s==="protein"||s==="water"||s==="selected") setSizeSelection(s as any);

    const pr = parseFloat(sessionStorage.getItem("proteinRadius")||"");
    if (!isNaN(pr)) setProteinRadius(pr);
    const wr = parseFloat(sessionStorage.getItem("waterRadius")||"");
    if (!isNaN(wr)) setWaterRadius(wr);

    const hi = sessionStorage.getItem("highlightEnabled");
    if (hi==="true"||hi==="false") setHighlightEnabled(hi==="true");

    const ce = sessionStorage.getItem("customExpr");
    if (ce!==null) { setCustomExpr(ce); setShowCustomRow(ce.trim()!==""); }

    updateStyle(false);
    registerHoverLabels();
    viewer.zoomTo();
    viewer.render();
    updateClickHandler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewer]);

  // persist & restyle on controls change
  useEffect(() => { if (viewer) {
    sessionStorage.setItem("representation", representation);
    updateStyle();
  } }, [representation]);

  useEffect(() => { if (viewer) {
    sessionStorage.setItem("residueFilter", residueFilter);
    updateStyle();
  } }, [residueFilter]);

  useEffect(() => { if (viewer) {
    sessionStorage.setItem("sizeSelection", sizeSelection);
    applySphereResizing();
  } }, [sizeSelection]);

  useEffect(() => { if (viewer) {
    sessionStorage.setItem("proteinRadius", proteinRadius+"");
    applySphereResizing();
  } }, [proteinRadius]);

  useEffect(() => { if (viewer) {
    sessionStorage.setItem("waterRadius", waterRadius+"");
    applySphereResizing();
  } }, [waterRadius]);

  useEffect(() => { if (viewer) {
    sessionStorage.setItem("highlightEnabled", highlightEnabled?"true":"false");
    updateClickHandler();
  } }, [highlightEnabled]);

  useEffect(() => { if (viewer) {
    sessionStorage.setItem("customExpr", customExpr);
    setShowCustomRow(customExpr.trim()!=="");
  } }, [customExpr]);

  // annotate original names onto atoms
  const annotateAtoms = (model: any, rawPdb: string) => {
    const lines = rawPdb.split("\n").filter(l=>l.startsWith("ATOM")||l.startsWith("HETATM"));
    model.atoms.forEach((atom:any,i:number)=>{
      const tail = lines[i].slice(66).trim().split(/\s+/);
      atom.origResName = tail[0];
      atom.origAtomSymbol = tail[tail.length-1];
    });
  };

  // styling logic
  const updateStyle = (doRender=true) => {
    if (!viewer) return;
    setShowSphereControls(representation==="sphere");
    setShowCustomRow(false);
    viewer.setStyle({}, {});

    const p={resn:["VAL"]}, w={resn:["TIP"]};

    if (representation==="cartoon") {
      if (residueFilter!=="water") viewer.setStyle(p,{cartoon:{color:"yellow"}});
    }
    else if (representation==="stick") {
      if (residueFilter!=="water") viewer.setStyle(p,{stick:{radius:0.2,color:"yellow"}});
      if (residueFilter!=="protein") viewer.setStyle(w,{sphere:{radius:0.3,color:"#ADD8E6",opacity:1}});
    }
    else {
      if (residueFilter==="all") {
        viewer.setStyle({},   {sphere:{radius:waterRadius, color:"#ADD8E6",opacity:1}});
        viewer.setStyle(p,    {sphere:{radius:proteinRadius,color:"yellow", opacity:1}});
      }
      else if (residueFilter==="protein") {
        viewer.setStyle(p,    {sphere:{radius:proteinRadius,color:"yellow", opacity:1}});
      }
      else {
        viewer.setStyle(w,    {sphere:{radius:waterRadius, color:"#ADD8E6",opacity:1}});
      }
    }

    viewer.zoomTo();
    if (doRender) viewer.render();
  };

  // sphere resizing logic
  const applySphereResizing = (doRender=true) => {
    if (!viewer) return;
    const t = sizeSelection;
    const p={resn:["VAL"]}, w={resn:["TIP"]};

    updateStyle(false);

    if (t==="all") {
      viewer.setStyle(w,{sphere:{radius:waterRadius,color:"#ADD8E6",opacity:1}});
      viewer.setStyle(p,{sphere:{radius:proteinRadius,color:"yellow",opacity:1}});
      setShowCustomRow(false);
    }
    else if (t==="protein") {
      viewer.setStyle(p,{sphere:{radius:proteinRadius,color:"yellow",opacity:1}});
      setShowCustomRow(false);
    }
    else if (t==="water") {
      viewer.setStyle(w,{sphere:{radius:waterRadius,color:"#ADD8E6",opacity:1}});
      setShowCustomRow(false);
    }
    else {
      setShowCustomRow(true);
      return;
    }

    viewer.zoomTo();
    if (doRender) viewer.render();
  };

  // hover labels
  const registerHoverLabels = () => {
    if (!viewer) return;
    viewer.setHoverable({}, false, null, null);
    viewer.setHoverable(
      {},
      true,
      (atom:any, vwr:any) => {
        if (!atom) return;
        vwr.removeAllLabels();

        let txt:string;
        if (atom.resn==="VAL") {
          txt =
            `Atom: ${atom.serial};\n` +
            `Residue: ${atom.resn};\n` +
            `Residue Name: ${atom.origResName}`;
        } else {
          txt =
            `Atom: ${atom.serial};\n` +
            `Molecule: ${atom.origResName};\n` +
            `Atom name: ${atom.origAtomSymbol}`;
        }

        vwr.addLabel(txt, {
          position: { x: atom.x, y: atom.y, z: atom.z },
          backgroundColor: "lightgray",
          fontColor: "black",
          fontSize: 16,
          inFront: true
        });
        vwr.render();
      },
      (_:any, vwr:any) => {
        vwr.removeAllLabels();
        vwr.render();
      }
    );
  };

  // click highlight + label
  const updateClickHandler = () => {
    if (!viewer) return;
    viewer.setClickable({}, false, () => {});

    if (representation==="sphere" && highlightEnabled) {
      viewer.setClickable({}, true, (atom:any) => {
        if (!atom) return;
        if (lastClickedAtom) {
          const wasP = lastClickedAtom.resn==="VAL";
          const br = wasP ? proteinRadius : waterRadius;
          const col = wasP ? "yellow" : "#ADD8E6";
          viewer.setStyle(
            { serial:lastClickedAtom.serial },
            { sphere:{radius:br, color:col, opacity:1} }
          );
          setLastClickedAtom(null);
        }
        const isP = atom.resn==="VAL";
        viewer.setStyle(
          { serial:atom.serial },
          { sphere:{radius:(isP?proteinRadius*1.5:waterRadius*1.5), color:"lime", opacity:1} }
        );
        setLastClickedAtom(atom);

        viewer.removeAllLabels();
        let label:string;
        if (isP) {
          label =
            `Atom: ${atom.serial}\n` +
            `Residue: ${atom.resn}\n` +
            `Residue Name: ${atom.origResName}`;
        } else {
          label =
            `Atom: ${atom.serial}\n` +
            `Molecule: ${atom.origResName}\n` +
            `Atom name: ${atom.origAtomSymbol}`;
        }
        viewer.addLabel(label, {
          position:{x:atom.x,y:atom.y,z:atom.z},
          backgroundColor:"white",
          fontColor:"black",
          fontSize:12,
          inFront:true
        });
        viewer.render();
      });
    }
  };

  // file input handler
  const onFileChange = (e:React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f || !viewer) return;
    const reader = new FileReader();
    reader.onload = evt => {
      const raw = (evt.target?.result as string)||"";
      const pdb = remapResNames(raw);
      sessionStorage.setItem("pdbData", pdb);
      sessionStorage.setItem("fileName", f.name);
      setFileName(f.name);

      viewer.clear();
      const mdl = viewer.addModel(pdb, "pdb");
      annotateAtoms(mdl, raw);

      updateStyle(false);
      registerHoverLabels();
      viewer.zoomTo();
      viewer.render();
      updateClickHandler();
    };
    reader.readAsText(f);
  };

  // load by PDB ID
  const onLoadClick = () => {
    if (!viewer) return;
    const id = pdbID.trim().toLowerCase();
    if (!id) { alert("Enter PDB ID."); return; }
    fetch(`https://files.rcsb.org/download/${id}.pdb`)
      .then(r => { if (!r.ok) throw new Error("Invalid ID"); return r.text(); })
      .then(raw => {
        const pdb = remapResNames(raw);
        sessionStorage.setItem("pdbData", pdb);
        sessionStorage.removeItem("fileName");
        setFileName("");

        viewer.clear();
        const mdl = viewer.addModel(pdb, "pdb");
        annotateAtoms(mdl, raw);

        updateStyle(false);
        registerHoverLabels();
        viewer.zoomTo();
        viewer.render();
        updateClickHandler();
      })
      .catch(err => alert(err.message));
  };

  // custom selection
  const onApplyCustom = () => {
    if (!viewer) return;
    const expr = customExpr.trim();
    if (!expr) { alert("Invalid selection."); return; }
    updateStyle(false);
    try {
      viewer.setStyle({ eval:expr }, {
        sphere:{ radius:Math.max(proteinRadius,waterRadius),
                 color:"orange", opacity:1 }
      });
      registerHoverLabels();
      viewer.zoomTo();
      viewer.render();
      updateClickHandler();
    } catch (e:any) {
      alert("Error: "+e.message);
    }
  };

  return (
    <div style={{ display:"flex" }}>
      <div style={{ width:240, padding:16 }}>
        <div style={controlRow}>
          <input type="file" accept=".pdb" onChange={onFileChange} style={inputFlex}/>
        </div>
        {fileName && (
          <div style={{ ...controlRow, marginBottom:24 }}>
            <div style={{ ...labelStyle, fontStyle:"italic" }}>File:</div>
            <div style={inputFlex}>{fileName}</div>
          </div>
        )}
        <div style={controlRow}>
          <label style={labelStyle}>PDB ID:</label>
          <input
            type="text"
            placeholder="e.g. 1crn"
            value={pdbID}
            onChange={e=>setPdbID(e.target.value)}
            style={{ width:80, marginRight:8 }}
          />
          <button onClick={onLoadClick}>Load</button>
        </div>
        <div style={controlRow}>
          <label style={labelStyle}>Rendering:</label>
          <select
            value={representation}
            onChange={e=>setRepresentation(e.target.value as any)}
            style={inputFlex}
          >
            <option value="cartoon">Cartoon</option>
            <option value="stick">Stick</option>
            <option value="sphere">Sphere</option>
          </select>
        </div>
        <div style={controlRow}>
          <label style={labelStyle}>Filter:</label>
          <select
            value={residueFilter}
            onChange={e=>setResidueFilter(e.target.value as any)}
            style={inputFlex}
          >
            <option value="all">All</option>
            <option value="protein">Protein Only</option>
            <option value="water">Water Only</option>
          </select>
        </div>

        {showSphereControls && (
          <>
            <div style={controlRow}>
              <label style={labelStyle}>Resize:</label>
              <select
                value={sizeSelection}
                onChange={e=>setSizeSelection(e.target.value as any)}
                style={inputFlex}
              >
                <option value="all">All atoms</option>
                <option value="protein">Protein</option>
                <option value="water">Water</option>
                <option value="selected">Custom…</option>
              </select>
            </div>

            <div style={controlRow}>
              <label style={labelStyle}>
                {sizeSelection === "protein"
                  ? "Protein Radius:"
                  : sizeSelection === "water"
                  ? "Water Radius:"
                  : "Radius:"}
              </label>
              <input
                type="range"
                min="0.1"
                max="2.0"
                step="0.05"
                value={
                  sizeSelection === "protein"
                    ? proteinRadius
                    : sizeSelection === "water"
                    ? waterRadius
                    : (proteinRadius + waterRadius) / 2
                }
                onChange={e=>{
                  const v = parseFloat(e.target.value);
                  if (sizeSelection==="protein") setProteinRadius(v);
                  else if (sizeSelection==="water") setWaterRadius(v);
                  else { setProteinRadius(v); setWaterRadius(v); }
                }}
                style={{ flex:1, marginRight:8 }}
              />
              <input
                type="number"
                min="0.1"
                max="2.0"
                step="0.05"
                value={
                  sizeSelection === "protein"
                    ? proteinRadius
                    : sizeSelection === "water"
                    ? waterRadius
                    : (proteinRadius + waterRadius) / 2
                }
                onChange={e=>{
                  const v = parseFloat(e.target.value);
                  if (isNaN(v)) return;
                  if (sizeSelection==="protein") setProteinRadius(v);
                  else if (sizeSelection==="water") setWaterRadius(v);
                  else { setProteinRadius(v); setWaterRadius(v); }
                }}
                style={{ width:60 }}
              />
            </div>
          </>
        )}

        {showCustomRow && (
          <div style={controlRow}>
            <label style={labelStyle}>3Dmol Selection:</label>
            <input
              type="text"
              placeholder="e.g. resn ALA"
              value={customExpr}
              onChange={e=>setCustomExpr(e.target.value)}
              style={{ flex:1, marginRight:8 }}
            />
            <button onClick={onApplyCustom}>Apply</button>
          </div>
        )}
      </div>

      <div
        id="viewer"
        ref={viewerRef}
        style={{ flexGrow:1, height:600, borderLeft:"1px solid #ddd" }}
      />
    </div>
  );
};

export default App;
