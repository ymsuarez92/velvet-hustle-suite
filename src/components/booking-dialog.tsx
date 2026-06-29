import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAvailableSlots, createBooking } from "@/lib/booking.functions";
import { X, Loader2, Check, Calendar, Clock } from "lucide-react";

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
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-foreground/40 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-t-3xl bg-background shadow-2xl md:rounded-3xl" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full bg-foreground/5 hover:bg-foreground/10">
          <X className="h-4 w-4" />
        </button>

        {confirmedId ? (
          <div className="p-10 text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
              <Check className="h-7 w-7" />
            </div>
            <h2 className="mt-6 font-display text-3xl">Appointment requested</h2>
            <p className="mt-3 text-muted-foreground">
              {selectedService?.name} · {slot && fmtDay(slot.slice(0, 10))} at {slot && fmtTime(slot)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">We'll confirm shortly. A receipt is on its way.</p>
            <button onClick={onClose} className="btn-luxury mt-8">Done</button>
          </div>
        ) : (
          <div className="p-6 md:p-10">
            <p className="eyebrow">Reservation</p>
            <h2 className="mt-2 font-display text-3xl md:text-4xl">Book your visit</h2>

            {/* Service */}
            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Service</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
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
            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Date</p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
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
            <div className="mt-8">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Time</p>
              <div className="mt-3 min-h-[60px]">
                {slotsQ.isLoading && <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading availability…</div>}
                {slotsQ.data && slotsQ.data.length === 0 && <p className="text-sm text-muted-foreground">No availability on this day. Try another date.</p>}
                {slotsQ.data && slotsQ.data.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {slotsQ.data.map((t) => (
                      <button key={t} onClick={() => setSlot(t)}
                        className={`rounded-full border px-4 py-2 text-sm transition ${slot === t ? "border-[color:var(--bronze)] bg-foreground text-background" : "border-border hover:border-foreground/40"}`}>
                        {fmtTime(t)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Form */}
            {slot && (
              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                <Input label="Full name *" value={name} onChange={setName} placeholder="John Smith" />
                <Input label="Phone *" value={phone} onChange={setPhone} placeholder="+1 555 0000" />
                <Input label="Email" value={email} onChange={setEmail} placeholder="you@email.com" />
                <Input label="Notes" value={notes} onChange={setNotes} placeholder="Anything we should know" />
                <div className="sm:col-span-2 mt-2 flex items-center justify-between rounded-xl bg-secondary/60 p-4">
                  <div className="flex items-center gap-4 text-sm">
                    <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4 text-[color:var(--bronze)]" /> {fmtDay(slot.slice(0,10))}</span>
                    <span className="inline-flex items-center gap-1.5"><Clock className="h-4 w-4 text-[color:var(--bronze)]" /> {fmtTime(slot)}</span>
                  </div>
                  <button
                    disabled={bookMut.isPending || !name.trim() || phone.trim().length < 6}
                    onClick={() => bookMut.mutate()}
                    className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background disabled:opacity-50">
                    {bookMut.isPending ? "Booking…" : "Confirm booking"}
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

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="mt-2 w-full rounded-md border bg-background px-4 py-3 text-sm outline-none focus:border-[color:var(--bronze)]" />
    </label>
  );
}