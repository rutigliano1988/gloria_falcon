import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { TEST_DB, mockearEntornoNext } from "./setup";

mockearEntornoNext();

type Mod = typeof import("@/app/(dashboard)/alumnos/actions");
type PrismaT = typeof import("@/lib/prisma")["prisma"];

describe.skipIf(!TEST_DB)("edición de la ficha del alumno (integración)", () => {
  let acciones: Mod;
  let prisma: PrismaT;
  let audit: { registrarAudit: { mock: { calls: unknown[][] } } };

  const base = {
    primerApellido: "Pérez",
    segundoApellido: "",
    primerNombre: "Ana",
    segundoNombre: "",
    cedulaEscolar: "",
    municipioNacimiento: "",
    estadoNacimiento: "",
    sexo: "F" as const,
    fechaNacimiento: "2019-05-10",
    domicilio: "",
    telefonoHogar: "",
    procedencia: "HOGAR" as const,
    nombrePlantelOrigen: "",
    salud: { enfermedadActual: "", tratamiento: "", alergiasMedicamentos: "Penicilina", medicamentoFiebre: "", seguroSaludTelefono: "" },
    representantes: [] as Parameters<Mod["actualizarAlumno"]>[1]["representantes"],
    autorizados: [],
    contactos: [],
  };

  async function crearAlumno(nombre = "Ana") {
    return prisma.alumno.create({
      data: {
        primerApellido: "Pérez",
        primerNombre: nombre,
        sexo: "F",
        fechaNacimiento: new Date("2019-05-10"),
        saludAlumno: { create: { alergiasMedicamentos: "Penicilina" } },
        representantes: {
          create: [
            { tipo: "MADRE", apellidosNombres: "María Pérez", cedula: "V-1" },
            { tipo: "PADRE", apellidosNombres: "José Pérez" },
          ],
        },
        autorizadosRetiro: { create: [{ nombre: "Abuela", orden: 1 }] },
        contactosEmergencia: { create: [{ nombre: "Tía", telefono: "0414", orden: 1 }] },
      },
      include: { representantes: true },
    });
  }

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    acciones = await import("@/app/(dashboard)/alumnos/actions");
    audit = (await import("@/lib/audit")) as unknown as typeof audit;
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "representantes","autorizados_retiro","salud_alumno","contactos_emergencia","servicios_alumno","inscripciones","pagos","alumnos" CASCADE'
    );
  });

  it("actualiza datos, salud, representantes, autorizados y contactos", async () => {
    const a = await crearAlumno();
    const madre = a.representantes.find((r) => r.tipo === "MADRE")!;

    const r = await acciones.actualizarAlumno(a.id, {
      ...base,
      segundoNombre: "  Lucía ",
      salud: { ...base.salud, alergiasMedicamentos: "", enfermedadActual: "Asma" },
      representantes: [
        { id: madre.id, tipo: "MADRE", apellidosNombres: "María Pérez López", cedula: "V-2", email: "maria@correo.com" },
        { tipo: "TUTOR", apellidosNombres: "Carlos Ruiz", fechaNacimiento: "1980-01-01" },
      ],
      autorizados: [{ nombre: "Abuelo", cedula: "V-3" }, { nombre: "", cedula: "" }],
      contactos: [{ nombre: "Vecina", telefono: "0412" }],
    });
    expect(r).toEqual({ ok: true });

    const f = await prisma.alumno.findUniqueOrThrow({
      where: { id: a.id },
      include: { saludAlumno: true, representantes: true, autorizadosRetiro: true, contactosEmergencia: true },
    });
    expect(f.segundoNombre).toBe("Lucía");
    expect(f.saludAlumno).toMatchObject({ alergiasMedicamentos: null, enfermedadActual: "Asma" });
    // El padre (no enviado) se borra; la madre se edita en su mismo registro; el tutor se crea.
    expect(f.representantes.map((x) => x.tipo).sort()).toEqual(["MADRE", "TUTOR"]);
    const m = f.representantes.find((x) => x.tipo === "MADRE")!;
    expect(m).toMatchObject({ id: madre.id, apellidosNombres: "María Pérez López", cedula: "V-2", email: "maria@correo.com" });
    expect(f.autorizadosRetiro).toEqual([expect.objectContaining({ nombre: "Abuelo", cedula: "V-3", orden: 1 })]);
    expect(f.contactosEmergencia).toEqual([expect.objectContaining({ nombre: "Vecina", telefono: "0412", orden: 1 })]);

    // La auditoría guarda nombres de campos, nunca valores.
    const [llamada] = audit.registrarAudit.mock.calls.at(-1) as [{ accion: string; meta: Record<string, unknown> }];
    expect(llamada.accion).toBe("ALUMNO_DATOS_ACTUALIZADOS");
    expect(llamada.meta.camposCambiados).toEqual(["segundoNombre", "salud.enfermedadActual", "salud.alergiasMedicamentos"]);
    expect(JSON.stringify(llamada.meta)).not.toMatch(/Asma|Lucía|María/);
  });

  it("no permite editar representantes de otro alumno", async () => {
    const a = await crearAlumno("Ana");
    const b = await crearAlumno("Beatriz");
    const ajeno = b.representantes[0];

    const r = await acciones.actualizarAlumno(a.id, {
      ...base,
      representantes: [{ id: ajeno.id, tipo: "MADRE", apellidosNombres: "Hackeado" }],
    });
    expect(r.ok).toBe(false);
    const sinCambios = await prisma.representante.findUniqueOrThrow({ where: { id: ajeno.id } });
    expect(sinCambios.apellidosNombres).toBe(ajeno.apellidosNombres);
    // Y la ficha de A no se tocó (no se borraron sus representantes).
    expect(await prisma.representante.count({ where: { alumnoId: a.id } })).toBe(2);
  });

  it("valida los datos y la cédula escolar duplicada", async () => {
    const a = await crearAlumno("Ana");
    const b = await crearAlumno("Beatriz");
    await prisma.alumno.update({ where: { id: b.id }, data: { cedulaEscolar: "CE-1" } });

    expect((await acciones.actualizarAlumno(a.id, { ...base, primerNombre: "  " })).ok).toBe(false);
    expect((await acciones.actualizarAlumno(a.id, { ...base, fechaNacimiento: "2099-01-01" })).ok).toBe(false);
    expect((await acciones.actualizarAlumno(a.id, { ...base, primerApellido: "x".repeat(61) })).ok).toBe(false);

    const dup = await acciones.actualizarAlumno(a.id, { ...base, cedulaEscolar: "CE-1" });
    expect(dup).toEqual({ ok: false, error: "La cédula escolar ya está registrada para otro alumno." });
    // La transacción se revirtió: los representantes siguen ahí.
    expect(await prisma.representante.count({ where: { alumnoId: a.id } })).toBe(2);

    expect((await acciones.actualizarAlumno("no-existe", base)).ok).toBe(false);
  });
});
