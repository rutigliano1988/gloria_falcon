"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2 } from "lucide-react";
import { actualizarAlumno } from "../../actions";
import {
  ESTADOS_VE,
  RepresentanteCampos,
  representanteVacio,
  TIPO_REPRESENTANTE_LABELS,
  type RepresentanteCamposValor,
} from "../../ficha-campos";
import { useToast } from "@/hooks/use-toast";
import { calcularEdad } from "@/lib/utils";

type TipoRep = keyof typeof TIPO_REPRESENTANTE_LABELS;
type Procedencia = "HOGAR" | "MISMO_PLANTEL" | "OTRO_PLANTEL";

export type RepresentanteEdicion = RepresentanteCamposValor & { id?: string; tipo: TipoRep; clave: string };
type Persona = { nombre: string; cedula: string };
type Contacto = { nombre: string; telefono: string };

export interface FichaEdicion {
  id: string;
  datos: {
    primerApellido: string;
    segundoApellido: string;
    primerNombre: string;
    segundoNombre: string;
    cedulaEscolar: string;
    municipioNacimiento: string;
    estadoNacimiento: string;
    sexo: "M" | "F";
    fechaNacimiento: string;
    domicilio: string;
    telefonoHogar: string;
    procedencia: Procedencia;
    nombrePlantelOrigen: string;
  };
  salud: {
    enfermedadActual: string;
    tratamiento: string;
    alergiasMedicamentos: string;
    medicamentoFiebre: string;
    seguroSaludTelefono: string;
  };
  representantes: RepresentanteEdicion[];
  autorizados: Persona[];
  contactos: Contacto[];
}

const MIN_AUTORIZADOS = 2;
const MIN_CONTACTOS = 3;

function completar<T>(lista: T[], minimo: number, vacio: () => T): T[] {
  return [...lista, ...Array.from({ length: Math.max(0, minimo - lista.length) }, vacio)];
}

export function EditarAlumnoForm({ ficha }: { ficha: FichaEdicion }) {
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [datos, setDatos] = useState(ficha.datos);
  const [salud, setSalud] = useState(ficha.salud);
  const [reps, setReps] = useState(ficha.representantes);
  const [autorizados, setAutorizados] = useState(() =>
    completar(ficha.autorizados, MIN_AUTORIZADOS, () => ({ nombre: "", cedula: "" }))
  );
  const [contactos, setContactos] = useState(() =>
    completar(ficha.contactos, MIN_CONTACTOS, () => ({ nombre: "", telefono: "" }))
  );

  const edad = datos.fechaNacimiento ? calcularEdad(new Date(datos.fechaNacimiento)) : null;

  const d = (k: keyof typeof datos) => ({
    value: datos[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setDatos({ ...datos, [k]: e.target.value }),
  });
  const s = (k: keyof typeof salud) => ({
    value: salud[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSalud({ ...salud, [k]: e.target.value }),
  });

  const agregarRep = (tipo: TipoRep) =>
    setReps([...reps, { ...representanteVacio(), tipo, clave: `nuevo-${tipo}` }]);
  const quitarRep = (clave: string) => {
    const rep = reps.find((r) => r.clave === clave);
    if (rep?.id && !window.confirm(`¿Eliminar los datos de ${rep.apellidosNombres || "este representante"}? Se borrarán al guardar.`)) return;
    setReps(reps.filter((r) => r.clave !== clave));
  };

  const handleSubmit = async () => {
    if (!datos.primerApellido.trim() || !datos.primerNombre.trim() || !datos.fechaNacimiento) {
      toast({ title: "Campos obligatorios", description: "Completa los campos marcados con *", variant: "destructive" });
      return;
    }
    const repSinNombre = reps.find((r) => !r.apellidosNombres.trim());
    if (repSinNombre) {
      toast({
        title: "Representante incompleto",
        description: `Escribe el nombre (${TIPO_REPRESENTANTE_LABELS[repSinNombre.tipo]}) o quita ese bloque.`,
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const r = await actualizarAlumno(ficha.id, {
        ...datos,
        salud,
        representantes: reps.map((r) => ({
          id: r.id, tipo: r.tipo, apellidosNombres: r.apellidosNombres, fechaNacimiento: r.fechaNacimiento,
          cedula: r.cedula, telefonoHab: r.telefonoHab, telefonoCelular: r.telefonoCelular,
          ocupacion: r.ocupacion, telefonoOficina: r.telefonoOficina, email: r.email,
        })),
        autorizados: autorizados.filter((a) => a.nombre.trim()),
        contactos: contactos.filter((c) => c.nombre.trim()),
      });
      if (!r.ok) {
        toast({ title: "No se pudo guardar", description: r.error, variant: "destructive" });
        return;
      }
      toast({ title: "Datos actualizados" });
      router.push(`/alumnos/${ficha.id}`);
      router.refresh();
    } catch {
      toast({ title: "Error", description: "No se pudo guardar. Intenta de nuevo.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const tiposPresentes = new Set(reps.map((r) => r.tipo));

  return (
    <div className="space-y-6">
      {/* ─── Datos Personales ─── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Datos Personales del Alumno</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>Primer Apellido *</Label><Input {...d("primerApellido")} /></div>
            <div><Label>Segundo Apellido</Label><Input {...d("segundoApellido")} /></div>
            <div><Label>Primer Nombre *</Label><Input {...d("primerNombre")} /></div>
            <div><Label>Segundo Nombre</Label><Input {...d("segundoNombre")} /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div><Label>Cédula Escolar</Label><Input placeholder="Asignado por el plantel" {...d("cedulaEscolar")} /></div>
            <div>
              <Label>Sexo *</Label>
              <Select value={datos.sexo} onValueChange={(v) => setDatos({ ...datos, sexo: v as "M" | "F" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="M">Masculino</SelectItem>
                  <SelectItem value="F">Femenino</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Fecha de Nacimiento * <span className="text-xs font-normal text-muted-foreground">(dd/mm/aaaa)</span></Label>
              <DatePicker value={datos.fechaNacimiento} onChange={(v) => setDatos({ ...datos, fechaNacimiento: v })} />
              {edad !== null && <p className="text-xs text-muted-foreground mt-1">Edad: {edad} años</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>Municipio de Nacimiento</Label><Input {...d("municipioNacimiento")} /></div>
            <div>
              <Label>Estado / Entidad Federal</Label>
              <Select value={datos.estadoNacimiento} onValueChange={(v) => setDatos({ ...datos, estadoNacimiento: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                <SelectContent>
                  {ESTADOS_VE.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div><Label>Domicilio</Label><Textarea rows={2} {...d("domicilio")} /></div>
            <div><Label>Teléfono del Hogar</Label><Input {...d("telefonoHogar")} /></div>
          </div>

          <div>
            <Label>Procedencia</Label>
            <Select value={datos.procedencia} onValueChange={(v) => setDatos({ ...datos, procedencia: v as Procedencia })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="HOGAR">Hogar</SelectItem>
                <SelectItem value="MISMO_PLANTEL">Mismo plantel</SelectItem>
                <SelectItem value="OTRO_PLANTEL">Otro plantel</SelectItem>
              </SelectContent>
            </Select>
            {datos.procedencia === "OTRO_PLANTEL" && (
              <Input className="mt-2" placeholder="Nombre del plantel de origen" {...d("nombrePlantelOrigen")} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* ─── Representantes ─── */}
      {reps.map((rep) => (
        <Card key={rep.clave}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Datos del Representante — {TIPO_REPRESENTANTE_LABELS[rep.tipo]}</CardTitle>
            <Button type="button" variant="ghost" size="sm" onClick={() => quitarRep(rep.clave)} disabled={loading}>
              <Trash2 className="mr-1 h-4 w-4" /> Quitar
            </Button>
          </CardHeader>
          <CardContent>
            <RepresentanteCampos
              valor={rep}
              onChange={(v) => setReps(reps.map((r) => (r.clave === rep.clave ? { ...r, ...v } : r)))}
            />
          </CardContent>
        </Card>
      ))}
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TIPO_REPRESENTANTE_LABELS) as TipoRep[])
          .filter((t) => !tiposPresentes.has(t))
          .map((t) => (
            <Button key={t} type="button" variant="outline" size="sm" onClick={() => agregarRep(t)} disabled={loading}>
              <Plus className="mr-1 h-4 w-4" /> Agregar {TIPO_REPRESENTANTE_LABELS[t].toLowerCase()}
            </Button>
          ))}
      </div>

      {/* ─── Autorizados ─── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Personas Autorizadas para Retiro</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {autorizados.map((a, i) => (
            <div key={i} className="contents">
              <div>
                <Label>Persona {i + 1} — Nombre completo</Label>
                <Input
                  value={a.nombre}
                  onChange={(e) => setAutorizados(autorizados.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))}
                />
              </div>
              <div>
                <Label>Persona {i + 1} — C.I.</Label>
                <Input
                  value={a.cedula}
                  onChange={(e) => setAutorizados(autorizados.map((x, j) => (j === i ? { ...x, cedula: e.target.value } : x)))}
                />
              </div>
            </div>
          ))}
          <p className="sm:col-span-2 text-xs text-muted-foreground">Deja el nombre vacío para eliminar a una persona.</p>
        </CardContent>
      </Card>

      {/* ─── Salud ─── */}
      <Card>
        <CardHeader><CardTitle className="text-base">Antecedentes de Salud</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div><Label>¿Padece alguna enfermedad?</Label><Textarea rows={2} {...s("enfermedadActual")} /></div>
          <div><Label>Tratamiento actual</Label><Input {...s("tratamiento")} /></div>
          <div><Label>¿Alérgico a algún medicamento?</Label><Input {...s("alergiasMedicamentos")} /></div>
          <div><Label>Medicamento a suministrar en caso de fiebre/dolor</Label><Input {...s("medicamentoFiebre")} /></div>
          <div><Label>Teléfono de emergencia del seguro de salud</Label><Input {...s("seguroSaludTelefono")} /></div>

          <Separator />
          <p className="text-sm font-medium">Contactos de Emergencia</p>
          {contactos.map((c, i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Contacto {i + 1} — Nombre</Label>
                <Input
                  value={c.nombre}
                  onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, nombre: e.target.value } : x)))}
                />
              </div>
              <div>
                <Label className="text-xs">Teléfono</Label>
                <Input
                  value={c.telefono}
                  onChange={(e) => setContactos(contactos.map((x, j) => (j === i ? { ...x, telefono: e.target.value } : x)))}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Cada cambio queda registrado en la auditoría (quién y qué campos, sin guardar los valores).
      </p>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()} disabled={loading}>Cancelar</Button>
        <Button onClick={handleSubmit} disabled={loading}>{loading ? "Guardando..." : "Guardar cambios"}</Button>
      </div>
    </div>
  );
}
