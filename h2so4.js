/* ── CONSTANTS & DATA ── */
  /*
    Formule i konstante preuzete izravno iz priloženog Excel kalkulatora
    "Kalkulator_doziranja_sumporne_kiseline.xlsx" (list "H2SO4 pH Calculator"):
 
      ΔpH               = Početni pH − Ciljni pH                              (B9 = B4-B5)
      Faktor temperature f_t = MAX(0.9, MIN(1.1, 1 − 0.004×(T − 25)))          (B10)
      Faktor alkalnosti f_TA = TA / 100                                        (B11)
      Konstanta K       = IF(c=36; 0,14; IF(c=12; 0,42; 0,14×(36/c)))          (B12)
                          (napomena: sve tri grane daju identičan rezultat
                          jer je 0,14×(36/36)=0,14 i 0,14×(36/12)=0,42 —
                          stoga je u kodu korištena jedinstvena formula
                          K = 0,14 × (36 / c))
      Potrebna količina kiseline [L] = K × V_b × ΔpH × f_t × f_TA              (B14)
 
    Napomena iz Excela (K3): "Model je empirijski i najtočniji za TA 80–140 ppm."
    Napomena iz Excela (K4): "Za druge koncentracije koristi skaliranje 36/%."
 
    Padajući izbornici (Temperatura, Ciljni pH, Koncentracija, TA) odgovaraju
    popisima za provjeru valjanosti podataka iz izvornog Excel lista (stupci E, H, G, F).
 
    NAPOMENA: Katalog pakiranja ("Ovo se treba definirati.") je namjerno
    prikazan kao placeholder jer stvarni IVAPOOL katalog pakiranja sumporne
    kiseline nije bio priložen — isto kao u kalkulatoru pH Minus granulata.
  */
 
  const $=id=>document.getElementById(id);
  const num=id=>parseFloat($(id).value)||0;
  const val=id=>$(id).value.trim();
  const fmt=(v,d=2)=>new Intl.NumberFormat('hr-HR',{minimumFractionDigits:d,maximumFractionDigits:d}).format(v);
 
  /* ── POPULATE DROPDOWNS (iz Excel popisa za provjeru valjanosti) ── */
  function populateSelect(id, values, decimals, defaultVal){
    const sel = $(id);
    sel.innerHTML = values.map(v=>{
      const label = decimals!==undefined ? fmt(v,decimals) : String(v);
      const selected = (v===defaultVal) ? ' selected' : '';
      return `<option value="${v}"${selected}>${label}</option>`;
    }).join('');
  }
  function rangeArr(start,end,step){
    const out=[]; for(let v=start; v<=end+1e-9; v+=step) out.push(Math.round(v*100)/100);
    return out;
  }
  populateSelect('temperaturaVode', rangeArr(15,35,1), 0, 33);
  populateSelect('ciljniPh', rangeArr(6.8,7.4,0.1), 1, 7.2);
  populateSelect('koncentracija', rangeArr(10,36,1), 0, 15);
  populateSelect('alkalnostTA', rangeArr(50,150,10), 0, 70);
 
  /* ── FAKTOR TEMPERATURE (Excel B10) ── */
  function tempFactor(t){
    return Math.max(0.9, Math.min(1.1, 1 - 0.004*(t-25)));
  }
 
  /* ── KONSTANTA K (Excel B12) ── */
  function constantK(c){
    return 0.14 * (36/c);
  }
 
  /* ── LIVE FACTOR CHIPS ── */
  function updateFactorChips(){
    const pocetni = num('pocetniPh');
    const ciljni = parseFloat(val('ciljniPh'))||0;
    const deltaPh = pocetni - ciljni;
    const t = parseFloat(val('temperaturaVode'))||0;
    const ft = tempFactor(t);
    const ta = parseFloat(val('alkalnostTA'))||0;
    const fta = ta/100;
    const c = parseFloat(val('koncentracija'))||15;
    const K = constantK(c);
    $('chipDeltaPh').textContent = fmt(deltaPh,2);
    $('chipFt').textContent = fmt(ft,3);
    $('chipFta').textContent = fmt(fta,2);
    $('chipK').textContent = fmt(K,3);
  }
 
  /* ── STATUS ── */
  function setStatus(text, badge='Gotovo'){
    const el = $('statusBadge');
    if(!el) return;
    el.textContent = badge;
    el.className = 'badge';
    if(badge==='Gotovo'||badge==='Spremno') el.classList.add('ok');
    else if(badge==='Greška'||badge==='Fallback') el.classList.add('error');
    else el.classList.add('warn');
    if(badge==='Greška'){
      el.title = text;
    }
  }
 
  /* ── BLINK VALIDATION ── */
  function oznaciPraznaPolja(){
    let prazno=false;
    document.querySelectorAll('input:not([readonly]):not([type="hidden"]), select').forEach(el=>{
      if(el.offsetParent===null) return;
      if(!el.value||el.value.trim()===''){
        el.classList.add('blink');
        prazno=true;
        setTimeout(()=>{ el.classList.remove('blink'); },2000);
      }
    });
    return prazno;
  }
 
  /* ── RENDER ROWS ── */
  function renderRows(rows){ document.querySelector('#rezultatTablica tbody').innerHTML=rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join(''); }
 
  /* ── RENDER CATALOG ──
     Preporuka konkretnog pakiranja je isključena dok se ne definira
     stvarni IVAPOOL katalog pakiranja. Kutija ostaje vidljiva kao
     placeholder ("Ovo se treba definirati.") bez obzira na izračun. */
  function renderCatalog(requiredL, selected){
    $('catalogBody').innerHTML = '<div style="padding:20px 8px;text-align:center;font-size:13px;color:var(--muted);">Ovo se treba definirati.</div>';
  }
 
  /* ── IZRAČUNAJ ── */
  function izracunaj(){ try{
    if(oznaciPraznaPolja()){ setStatus('Neka polja nisu unesena!','Greška'); return; }
 
    const volumen = num('volumenBazena');
    if(volumen<=0) throw new Error('Unesi volumen bazena.');
 
    const pocetniPh = num('pocetniPh');
    if(pocetniPh<=0) throw new Error('Unesi početni pH.');
 
    const ciljniPh = parseFloat(val('ciljniPh'));
    const temperaturaVode = parseFloat(val('temperaturaVode'));
    const koncentracija = parseFloat(val('koncentracija'));
    const alkalnostTA = parseFloat(val('alkalnostTA'));
 
    if(ciljniPh>=pocetniPh) throw new Error('Ciljni pH mora biti niži od početnog pH.');
 
    /* ── FORMULE (identične Excel listu "H2SO4 pH Calculator") ── */
    const deltaPh = pocetniPh - ciljniPh;                               // B9
    const ft = tempFactor(temperaturaVode);                             // B10
    const fta = alkalnostTA/100;                                        // B11
    const K = constantK(koncentracija);                                 // B12
    const kolicinaL = K * volumen * deltaPh * ft * fta;                 // B14
    const kolicinaMl = kolicinaL * 1000;
 
    $('mVolumen').textContent = `${fmt(volumen,1)} m³`;
    $('mLitri').textContent = `${fmt(kolicinaL,3)}`;
 
    $('formulaBox').innerHTML = `<strong>Primijenjena formula</strong><br><br>`
      +`V<sub>kiselina</sub> [L] = K × V<sub>b</sub> × ΔpH × f<sub>t</sub> × f<sub>TA</sub><br><br>`
      +`Volumen bazena V<sub>b</sub> = <strong>${fmt(volumen,1)} m³</strong><br>`
      +`Početni pH = <strong>${fmt(pocetniPh,1).replace('.',',')}</strong>, Ciljni pH = <strong>${fmt(ciljniPh,1).replace('.',',')}</strong><br>`
      +`ΔpH = ${fmt(pocetniPh,1)} − ${fmt(ciljniPh,1)} = <strong>${fmt(deltaPh,2)}</strong><br>`
      +`Faktor temperature f<sub>t</sub> (${fmt(temperaturaVode,0)} °C) = MAX(0,9; MIN(1,1; 1 − 0,004×(T−25))) = <strong>${fmt(ft,3)}</strong><br>`
      +`Faktor alkalnosti f<sub>TA</sub> (TA ${fmt(alkalnostTA,0)} ppm) = TA/100 = <strong>${fmt(fta,2)}</strong><br>`
      +`Koncentracija H₂SO₄ c = <strong>${fmt(koncentracija,0)} %</strong><br>`
      +`Konstanta K = 0,14 × (36 / c) = <strong>${fmt(K,3)}</strong><br><br>`
      +`Potrebna količina V = <strong>${fmt(kolicinaL,3)} L</strong> (= ${fmt(kolicinaMl,0)} mL)`;
 
    renderRows([
      ['Volumen bazena (V_b)',`${fmt(volumen,1)} m³`],
      ['Temperatura vode',`${fmt(temperaturaVode,0)} °C`],
      ['Početni pH',fmt(pocetniPh,1).replace('.',',')],
      ['Ciljni pH',fmt(ciljniPh,1).replace('.',',')],
      ['ΔpH',fmt(deltaPh,2)],
      ['Faktor temperature (f_t)',fmt(ft,3)],
      ['Ukupna alkalnost TA',`${fmt(alkalnostTA,0)} ppm`],
      ['Faktor alkalnosti (f_TA)',fmt(fta,2)],
      ['Koncentracija H₂SO₄ (c)',`${fmt(koncentracija,0)} %`],
      ['Konstanta K',fmt(K,3)],
      ['Potrebna količina kiseline (L)',`${fmt(kolicinaL,3)} L`],
      ['Potrebna količina kiseline (mL)',`${fmt(kolicinaMl,0)} mL`],
      ['Preporučeno pakiranje','Ovo se treba definirati.'],
    ]);
 
    renderCatalog(kolicinaL, null);
    updateFactorChips();
    setStatus('Izračun je dovršen.','Gotovo');
  }catch(err){ setStatus(err.message||'Došlo je do pogreške.','Greška'); } }
 
  /* ── UČITAJ PRIMJER ── */
  function ucitajPrimjer(){
    $('volumenBazena').value=42;
    $('pocetniPh').value=9.1;
    $('temperaturaVode').value='33';
    $('ciljniPh').value='7.2';
    $('koncentracija').value='15';
    $('alkalnostTA').value='70';
    updateFactorChips();
    renderCatalog(null,null);
    setStatus('Učitani su primjerni podaci.','Spremno');
  }
 
  /* ── OČISTI SVE ── */
  function ocistiSve(){
    $('volumenBazena').value='';
    $('pocetniPh').value='';
    $('temperaturaVode').value='33';
    $('ciljniPh').value='7.2';
    $('koncentracija').value='15';
    $('alkalnostTA').value='70';
    $('mVolumen').textContent='-'; $('mLitri').textContent='-';
    $('formulaBox').textContent='Formula će biti prikazana nakon izračuna.';
    renderRows([]);
    renderCatalog(null,null);
    updateFactorChips();
    setStatus('Polja su očišćena.','Spremno');
  }
 
  /* ── TOGGLE DETALJI ── */
  function toggleDetalji(){
    ['detailsNapomena','detailsTablica'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.classList.toggle('hidden');
    });
  }
 
  /* ── EVENT LISTENERS ── */
  $('temperaturaVode').addEventListener('change', updateFactorChips);
  $('ciljniPh').addEventListener('change', updateFactorChips);
  $('koncentracija').addEventListener('change', updateFactorChips);
  $('alkalnostTA').addEventListener('change', updateFactorChips);
  $('pocetniPh').addEventListener('input', updateFactorChips);
 
  /* ── INIT ── */
  updateFactorChips();
  renderCatalog(null, null);
  ucitajPrimjer();
