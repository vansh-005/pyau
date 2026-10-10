"""Contrast check for the theme tokens in apps/web/src/index.css (WCAG AA text >= 4.5:1, both themes). Keep the TOKENS in sync with the CSS."""
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def cr(a,b):
    la,lb=lum(a),lum(b); hi,lo=max(la,lb),min(la,lb); return (hi+0.05)/(lo+0.05)
T={
"light":dict(canvas="#FBF8F3",panel="#FFFFFF",ink="#1B2630",muted="#5C6873",border="#E7E0D5",water="#0A6C94",water_soft="#E4F1F6",on_water="#FFFFFF",clay="#A44A27",clay_soft="#FAEDE4",heat="#A35700",heat_soft="#FDF0D8",gap="#B3261E",gap_soft="#FCECEA"),
"dark":dict(canvas="#0E151A",panel="#151F26",ink="#EAF0F4",muted="#9FB0BD",border="#26343E",water="#5CBBE0",water_soft="#123241",on_water="#05222E",clay="#E89168",clay_soft="#3A2418",heat="#F0A94B",heat_soft="#3A2A10",gap="#FF8F86",gap_soft="#3D1C1A"),
}
pairs=[("ink","canvas"),("ink","panel"),("muted","canvas"),("muted","panel"),("water","canvas"),("water","panel"),("on_water","water"),("heat","panel"),("heat","heat_soft"),("gap","panel"),("gap","gap_soft"),("water","water_soft"),("clay","canvas"),("clay","panel"),("clay","clay_soft"),("ink","heat_soft"),("muted","water_soft"),("canvas","ink")]
bad=0
for th,t in T.items():
    print("==",th)
    for a,b in pairs:
        c=cr(t[a],t[b]); flag="" if c>=4.5 else "   <-- below 4.5"; bad+= c<4.5
        print(f"  {a:9} on {b:10} {c:5.2f}{flag}")
print("below 4.5:",bad)
