_B32 = "0123456789bcdefghjkmnpqrstuvwxyz"


def encode(lat: float, lng: float, precision: int = 7) -> str:
    """Standard geohash. Precision 7 is a ~150 m cell: the only form of rider location we store."""
    lat_r, lng_r = [-90.0, 90.0], [-180.0, 180.0]
    bits, bit, ch, even, out = [16, 8, 4, 2, 1], 0, 0, True, ""
    while len(out) < precision:
        rng, val = (lng_r, lng) if even else (lat_r, lat)
        mid = (rng[0] + rng[1]) / 2
        if val >= mid:
            ch |= bits[bit]
            rng[0] = mid
        else:
            rng[1] = mid
        even = not even
        if bit < 4:
            bit += 1
        else:
            out += _B32[ch]
            bit, ch = 0, 0
    return out
