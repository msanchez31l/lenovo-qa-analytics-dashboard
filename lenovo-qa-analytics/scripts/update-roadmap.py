#!/usr/bin/env python3
"""Convert the approved master XLSX to public read-only Road Map JSON.

Usage: python scripts/update-roadmap.py "C:/path/to/Migration Global Manual QA Check to Automated desktop tools.xlsx"
No third-party packages required. Only six explicitly approved columns are exported.
"""
import json, sys, zipfile, xml.etree.ElementTree as ET
from pathlib import Path
from datetime import datetime, timezone
S='http://schemas.openxmlformats.org/spreadsheetml/2006/main'
def cell_text(cell, strings):
    t=cell.attrib.get('t','')
    if t=='inlineStr':
        return ''.join(e.text or '' for e in cell.iter('{%s}t'%S)).strip()
    v=cell.find('{%s}v'%S)
    if v is None:return ''
    if t=='s':return strings[int(v.text or 0)].strip()
    return (v.text or '').strip()
def load_rows(path):
    with zipfile.ZipFile(path) as z:
        strings=[]
        if 'xl/sharedStrings.xml' in z.namelist():
            root=ET.fromstring(z.read('xl/sharedStrings.xml'))
            strings=[''.join(n.text or '' for n in si.iter('{%s}t'%S)) for si in root.findall('{%s}si'%S)]
        root=ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
        for row in root.iter('{%s}row'%S):
            values=['']*6
            for c in row.findall('{%s}c'%S):
                ref=c.attrib.get('r','')
                letters=''.join(ch for ch in ref if ch.isalpha())
                col=0
                for ch in letters:col=col*26+ord(ch.upper())-64
                if 1<=col<=6:values[col-1]=cell_text(c,strings)
            yield values
def main():
    if len(sys.argv)!=2:raise SystemExit('Usage: python scripts/update-roadmap.py master.xlsx')
    src=Path(sys.argv[1]);rows=list(load_rows(src))
    if not rows or rows[0][4].strip().lower()!='automation status':
        raise SystemExit('Unexpected workbook structure: expected Automation Status in E1')
    checks=[]
    for n,values in enumerate(rows[1:],2):
        area,category,check,method,status,tool=[str(v).strip() for v in values]
        if not any(values):continue
        if not area or not check or status.upper() not in ('AUTOMATED','PENDING'):
            raise SystemExit(f'Invalid roadmap entry at Excel row {n}')
        checks.append(dict(area=area,category=category,check=check,method=method,status=status.upper(),tool=tool))
    if not checks:raise SystemExit('No valid roadmap checks')
    target=Path(__file__).resolve().parents[1]/'public'/'data'/'roadmap.json'
    target.parent.mkdir(parents=True,exist_ok=True)
    payload=dict(source='Migration Global Manual QA Check to Automated desktop tools.xlsx',updatedAt=datetime.now(timezone.utc).isoformat(),checks=checks)
    target.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Generated {target}: {len(checks)} checks; {sum(x["status"]=="AUTOMATED" for x in checks)} automated; {sum(x["status"]=="PENDING" for x in checks)} pending')
if __name__=='__main__':main()
