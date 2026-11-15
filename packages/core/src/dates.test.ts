import { describe, expect, it } from "vitest";
import {
  addDays,
  dateInTZ,
  diffDays,
  formatDateBR,
  formatDateTimeBR,
  isISODate,
  parseDateBR,
  todayISO,
  wallClockInTZ,
  weekdayOf,
} from "./dates";
import {
  addBusinessDays,
  businessDaysBetween,
  easterSunday,
  holidaysForYear,
  isBusinessDay,
  isHoliday,
} from "./holidays";

describe("formatDateBR / parseDateBR", () => {
  it("round-trips dd/mm/aaaa", () => {
    expect(formatDateBR("2026-10-23")).toBe("23/10/2026");
    expect(parseDateBR("23/10/2026")).toBe("2026-10-23");
    expect(parseDateBR("5/1/26")).toBe("2026-01-05");
    expect(formatDateBR(null)).toBe("");
  });
  it("rejects invalid dates", () => {
    expect(parseDateBR("31/02/2026")).toBeNull();
    expect(parseDateBR("2026-10-23")).toBeNull();
    expect(parseDateBR("")).toBeNull();
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("2026-02-28")).toBe(true);
  });
  it("formats Date objects in São Paulo time, not UTC", () => {
    // 2026-10-24T01:30Z is still 23/10 22:30 in São Paulo (UTC-3, no DST since 2019)
    const d = new Date("2026-10-24T01:30:00Z");
    expect(formatDateBR(d)).toBe("23/10/2026");
    expect(formatDateTimeBR(d)).toBe("23/10/2026 22:30");
    expect(dateInTZ(d, "America/Sao_Paulo")).toBe("2026-10-23");
    expect(wallClockInTZ(d, "America/Sao_Paulo")).toEqual({
      date: "2026-10-23",
      hour: 22,
      minute: 30,
      weekday: 5,
    });
  });
  it("todayISO uses the provided clock", () => {
    expect(todayISO(new Date("2026-11-14T02:00:00Z"))).toBe("2026-11-13");
  });
});

describe("day arithmetic", () => {
  it("adds and diffs across month and year boundaries", () => {
    expect(addDays("2026-12-19", 17)).toBe("2027-01-05");
    expect(diffDays("2026-12-19", "2027-01-05")).toBe(17);
    expect(diffDays("2026-11-18", "2026-10-21")).toBe(-28);
    expect(weekdayOf("2026-10-23")).toBe(5); // Friday
    expect(weekdayOf("2026-11-15")).toBe(0); // Sunday
  });
});

describe("holidays", () => {
  it("computes Easter", () => {
    expect(easterSunday(2026)).toBe("2026-04-05");
    expect(easterSunday(2027)).toBe("2027-03-28");
    expect(easterSunday(2024)).toBe("2024-03-31");
  });
  it("lists 2026 movable holidays correctly", () => {
    const names = Object.fromEntries(holidaysForYear(2026).map((h) => [h.name, h.date]));
    expect(names["Carnaval (terça-feira)"]).toBe("2026-02-17");
    expect(names["Sexta-feira Santa"]).toBe("2026-04-03");
    expect(names["Corpus Christi"]).toBe("2026-06-04");
    expect(names["Dia da Consciência Negra"]).toBe("2026-11-20");
    expect(names["Aniversário de São Paulo"]).toBe("2026-01-25");
  });
  it("knows business days", () => {
    expect(isHoliday("2026-11-20")).toBe(true);
    expect(isBusinessDay("2026-11-20")).toBe(false);
    expect(isBusinessDay("2026-11-21")).toBe(false); // Saturday
    expect(isBusinessDay("2026-11-23")).toBe(true);
    expect(isHoliday("2026-07-09", "national")).toBe(false);
    expect(isHoliday("2026-07-09", "sao_paulo")).toBe(true);
  });
  it("adds business days skipping weekends and holidays", () => {
    // Fri 23/10 + 5 business days = Fri 30/10
    expect(addBusinessDays("2026-10-23", 5)).toBe("2026-10-30");
    // Fri 13/11 + 5: Mon 16, Tue 17, Wed 18, Thu 19, (Fri 20 holiday), Mon 23
    expect(addBusinessDays("2026-11-13", 5)).toBe("2026-11-23");
    expect(addBusinessDays("2026-11-13", 0)).toBe("2026-11-13");
    expect(businessDaysBetween("2026-11-13", "2026-11-23")).toBe(5);
  });
});
