package com.donutauction;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class Money {
    private static final Pattern P = Pattern.compile("^\\$?\\s*([\\d,]*\\.?\\d+)\\s*([kKmMbBtT]?)$");

    /** Parses 50m, 1.5b, 250k, 1,000,000 ... returns -1 if invalid. */
    public static double parse(String s) {
        Matcher m = P.matcher(s.trim());
        if (!m.matches()) return -1;
        double v = Double.parseDouble(m.group(1).replace(",", ""));
        switch (m.group(2).toLowerCase(Locale.ROOT)) {
            case "k": v *= 1e3; break;
            case "m": v *= 1e6; break;
            case "b": v *= 1e9; break;
            case "t": v *= 1e12; break;
            default: break;
        }
        return v;
    }

    public static String format(double v) {
        if (v >= 1e12) return "$" + trim(v / 1e12) + "T";
        if (v >= 1e9) return "$" + trim(v / 1e9) + "B";
        if (v >= 1e6) return "$" + trim(v / 1e6) + "M";
        if (v >= 1e3) return "$" + trim(v / 1e3) + "K";
        return "$" + trim(v);
    }

    private static String trim(double d) {
        String s = String.format(Locale.ROOT, "%.2f", d);
        s = s.replaceAll("0+$", "").replaceAll("\\.$", "");
        return s;
    }
}
