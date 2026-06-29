import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAvailableSlots, createBooking } from "@/lib/booking.functions";
import { X, Loader2, Check, Calendar as CalendarIcon, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type Service = { id: string; name: string; durationMin: number; price: number };

function todayISO(offset = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
function fmtDay(iso: string) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}
function isoFromDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function BookingDialog({
  open, onClose, slug, services, initialServiceId,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  services: Service[];
  initialServiceId?: string;
}) {
  const { t, lang } = useI18n();
  const [serviceId, setServiceId] = useState(initialServiceId ?? services[0]?.id ?? "");
  const [date, setDate] = useState(todayISO(1));
  const [slot, setSlot] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmedId, setConfirmedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setServiceId(initialServiceId ?? services[0]?.id ?? "");
      setSlot(null);
      setConfirmedId(null);
    }
  }, [open, initialServiceId, services]);

  const fetchSlots = useServerFn(getAvailableSlots);
  const slotsQ = useQuery({
    queryKey: ["slots", slug, date, serviceId],
    queryFn: () => fetchSlots({ data: { slug, date, serviceId } }),
    enabled: open && !!serviceId && !!date,
  });

  const book = useServerFn(createBooking);
  const bookMut = useMutation({
    mutationFn: () => book({ data: {
      slug, serviceId, startsAt: slot!,
      customerName: name, customerPhone: phone,
      customerEmail: email || undefined, notes: notes || undefined,
    } }),
    onSuccess: (r) => setConfirmedId(r.id),
  });

  const dateOptions = useMemo(() => Array.from({ length: 14 }).map((_, i) => todayISO(i)), []);
  const selectedService = services.find((s) => s.id === serviceId);
  const [dateOpen, setDateOpen] = useState(false);

  if (!open) return null;

  const locale = lang === "es" ? "es-ES" : "en-US";
  const fmtDayLong = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(locale, { weekday: "long", day: "numeric", month: "long" });
  const fmtTimeLoc = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/40 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-t-3xl bg-background shadow-2xl md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} aria-label="Close" className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-foreground/5 hover:bg-foreground/10">
          <X className="h-4 w-4" />
        </button>

        {confirmedId ? (
          <div className="p-8 md:p-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-7 w-7" />
            </div>
            <h2 className="mt-6 font-display text-3xl">{t("book.requested")}</h2>
            <p className="mt-3 text-muted-foreground">
              {selectedService?.name} · {slot && fmtDayLong(slot.slice(0, 10))} · {slot && fmtTimeLoc(slot)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">{t("book.willConfirm")}</p>
            <button onClick={onClose} className="btn-luxury mt-8">{t("book.done")}</button>
          </div>
        ) : (
          <div className="p-5 pt-6 md:p-10">
            <p className="eyebrow">{t("book.reservation")}</p>
            <h2 className="mt-2 font-display text-2xl md:text-4xl">{t("book.title")}</h2>

            {/* Service */}
            <div className="mt-6 md:mt-8">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("book.service")}</p>
              {/* Mobile: premium shadcn select */}
              <div className="md:hidden mt-3">
                <Select value={serviceId} onValueChange={(v) => { setServiceId(v); setSlot(null); }}>
                  <SelectTrigger className="h-12 w-full rounded-xl border bg-background px-4 text-sm font-medium">
                    <SelectValue placeholder={t("book.pickService")} />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        <span className="font-medium">{s.name}</span>
                        <span className="ml-2 text-muted-foreground">· {s.durationMin} {t("services.min")} · ${s.price}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {/* Desktop: card grid */}
              <div className="mt-3 hidden gap-2 md:grid sm:grid-cols-2">
                {services.map((s) => (
                  <button key={s.id} onClick={() => { setServiceId(s.id); setSlot(null); }}
                    className={`flex items-center justify-between rounded-xl border p-4 text-left transition ${serviceId === s.id ? "border-[color:var(--bronze)] bg-[color:var(--champagne)]/15" : "border-border hover:border-foreground/30"}`}>
                    <div>
                      <p className="text-sm font-semibold">{s.name}</p>
                      <p className="text-xs text-muted-foreground">{s.durationMin} min</p>
                    </div>
                    <p className="font-display text-lg">${s.price}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date */}
            <div className="mt-6 md:mt-8">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("book.date")}</p>
              {/* Mobile: full date picker */}
              <div className="md:hidden mt-3">
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-12 w-full items-center justify-between rounded-xl border bg-background px-4 text-sm font-medium"
                    >
                      <span className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4 text-[color:var(--bronze)]" />
                        {fmtDayLong(date)}
                      </span>
                      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("book.pickDate")}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={new Date(date + "T00:00:00")}
                      onSelect={(d) => { if (d) { setDate(isoFromDate(d)); setSlot(null); setDateOpen(false); } }}
                      disabled={(d) => {
                        const today = new Date(); today.setHours(0,0,0,0);
                        const max = new Date(); max.setDate(max.getDate() + 60);
                        return d < today || d > max;
                      }}
                      initialFocus
                      className={cn("p-3 pointer-events-auto")}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="mt-3 hidden gap-2 overflow-x-auto pb-2 md:flex">
                {dateOptions.map((d) => (
                  <button key={d} onClick={() => { setDate(d); setSlot(null); }}
                    className={`shrink-0 rounded-xl border px-4 py-3 text-center transition ${date === d ? "border-[color:var(--bronze)] bg-[color:var(--champagne)]/20" : "border-border hover:border-foreground/30"}`}>
                    <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{fmtDay(d).split(" ")[0]}</p>
                    <p className="mt-1 font-display text-lg leading-none">{new Date(d + "T00:00:00").getDate()}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Slots */}
            <div className="mt-6 md:mt-8">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("book.time")}</p>
              <div className="mt-3 min-h-[60px]">
                {slotsQ.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> {t("book.loading")}</div>}
                {slotsQ.data && slotsQ.data.length === 0 && <p className="text-sm text-muted-foreground">{t("book.empty")}</p>}
                {slotsQ.data && slotsQ.data.length > 0 && (
                  <>
                    {/* Mobile: premium select */}
                    <div className="md:hidden">
                      <Select value={slot ?? ""} onValueChange={(v) => setSlot(v || null)}>
                        <SelectTrigger className="h-12 w-full rounded-xl border bg-background px-4 text-sm font-medium">
                          <SelectValue placeholder={t("book.pickTime")} />
                        </SelectTrigger>
                        <SelectContent>
                          {slotsQ.data.map((time) => (
                            <SelectItem key={time} value={time}>{fmtTimeLoc(time)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Desktop: chips */}
                    <div className="hidden flex-wrap gap-2 md:flex">
                      {slotsQ.data.map((time) => (
                        <button key={time} onClick={() => setSlot(time)}
                          className={`rounded-full border px-4 py-2 text-sm transition ${slot === time ? "border-[color:var(--bronze)] bg-foreground text-background" : "border-border hover:border-foreground/40"}`}>
                          {fmtTimeLoc(time)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Form */}
            {slot && (
              <div className="mt-6 md:mt-8 grid gap-3 sm:grid-cols-2">
                <Input label={t("book.name")} value={name} onChange={setName} placeholder={t("book.namePh")} />
                <Input label={t("book.phone")} value={phone} onChange={setPhone} placeholder={t("book.phonePh")} type="tel" />
                <Input label={t("book.email")} value={email} onChange={setEmail} placeholder={t("book.emailPh")} type="email" />
                <label className="sm:col-span-2 block">
                  <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("book.comment")}</span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t("book.commentPh")}
                    rows={3}
                    maxLength={500}
                    className="mt-2 w-full resize-none rounded-md border bg-background px-4 py-3 text-sm outline-none focus:border-[color:var(--bronze)]"
                  />
                </label>
                <div className="sm:col-span-2 mt-2 flex flex-col gap-3 rounded-xl bg-secondary/60 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="inline-flex items-center gap-1.5"><CalendarIcon className="h-4 w-4 text-[color:var(--bronze)]" /> {fmtDayLong(slot.slice(0,10))}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-[color:var(--bronze)]" /> {fmtTimeLoc(slot)}</span>
                  </div>
                  <button
                    disabled={bookMut.isPending || !name.trim() || phone.trim().length < 6}
                    onClick={() => bookMut.mutate()}
                    className="w-full rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background disabled:opacity-50 sm:w-auto">
                    {bookMut.isPending ? t("book.booking") : t("book.confirm")}
                  </button>
                </div>
                {bookMut.error && <p className="sm:col-span-2 text-sm text-red-600">{(bookMut.error as Error).message}</p>}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus:border-[color:var(--bronze)]" />
    </label>
  );
}