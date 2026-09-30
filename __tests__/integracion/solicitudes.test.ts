import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { TEST_DB, mockearEntornoNext } from "./setup";

mockearEntornoNext();

type Mod = typeof import("@/app/(dashboard)/alumnos/solicitudes/actions");
type ModPublico = typeof import("@/app/(public)/inscripcion/[token]/actions");
type PrismaT = typeof import("@/lib/prisma")["prisma"];

describe.skipIf(!TEST_DB)("solicitudes de inscripción (integración)", () => {
  let acciones: Mod;
  let publico: ModPublico;
  let prisma: PrismaT;
  let anoId: string;
  let gradoId: string;

  const datosFormulario = {
    primerApellido: "Pérez",
    primerNombre: "Ana",
    sexo: "F" as const,
    fechaNacimiento: "2019-05-10",
    procedencia: "HOGAR" as const,
    representantes: [{ tipo: "MADRE" as const, apellidosNombres: "María Pérez", email: "" }],
    autorizados: [],
    contactosEmergencia: [{ nombre: "Tía Luisa", telefono: "0414-0000000", orden: 1 }],
    datosSalud: { alergiasMedicamentos: "Penicilina" },
  };

  async function crearEnlace(): Promise<{ id: string; token: string }> {
    await acciones.generarEnlaceSolicitud();
    const s = await prisma.solicitudInscripcion.findFirstOrThrow({ orderBy: { creadoEn: "desc" } });
    return { id: s.id, token: s.token };
  }

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    acciones = await import("@/app/(dashboard)/alumnos/solicitudes/actions");
    publico = await import("@/app/(public)/inscripcion/[token]/actions");
  });

  beforeEach(async () => {
    await prisma.$executeRawUnsafe(
      'TRUNCATE "solicitudes_inscripcion","servicios_alumno","inscripciones","representantes","autorizados_retiro","salud_alumno","contactos_emergencia","alumnos","secciones","grados","lapsos","anos_escolares" CASCADE'
    );
    anoId = (await prisma.anoEscolar.create({ data: { nombre: "2026-2027", activo: true } })).id;
    gradoId = (await prisma.grado.create({ data: { nombre: "1er Grado", nivel: "PRIMARIA", orden: 1 } })).id;
  });

  it("el token es aleatorio (43 caracteres base64url) y vence en 14 días", async () => {
    const { token } = await crearEnlace();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const s = await prisma.solicitudInscripcion.findUniqueOrThrow({ where: { token } });
    const dias = (s.expiraEn!.getTime() - Date.now()) / 86_400_000;
    expect(dias).toBeGreaterThan(13.9);
    expect(dias).toBeLessThan(14.1);
  });

  it("dos envíos simultáneos del formulario: solo uno se guarda", async () => {
    const { token } = await crearEnlace();
    const r = await Promise.all([
      publico.enviarSolicitud(token, datosFormulario),
      publico.enviarSolicitud(token, { ...datosFormulario, primerNombre: "Otra" }),
    ]);
    expect(r.filter((x) => x.ok)).toHaveLength(1);
  });

  it("un enlace vencido no acepta envíos", async () => {
    const { token } = await crearEnlace();
    await prisma.solicitudInscripcion.update({ where: { token }, data: { expiraEn: new Date(Date.now() - 1000) } });
    const r = await publico.enviarSolicitud(token, datosFormulario);
    expect(r.ok).toBe(false);
  });

  it("dos aprobaciones simultáneas crean un solo alumno y limpian los datos personales", async () => {
    const { id, token } = await crearEnlace();
    expect((await publico.enviarSolicitud(token, datosFormulario)).ok).toBe(true);

    const r = await Promise.allSettled([
      acciones.aprobarSolicitud(id, { anoEscolarId: anoId, gradoId }),
      acciones.aprobarSolicitud(id, { anoEscolarId: anoId, gradoId }),
    ]);
    // aprobarSolicitud termina con redirect (lanza NEXT_REDIRECT) cuando tiene éxito.
    const exitos = r.filter((x) => x.status === "rejected" && String(x.reason).includes("NEXT_REDIRECT"));
    expect(exitos).toHaveLength(1);
    expect(await prisma.alumno.count()).toBe(1);

    const s = await prisma.solicitudInscripcion.findUniqueOrThrow({ where: { id } });
    expect(s.estado).toBe("APROBADA");
    expect(s.datosSalud).toBeNull();
    expect(s.representantes).toBeNull();
    expect(s.fechaNacimiento).toBeNull();
    expect(s.primerApellido).toBe("Pérez");
    const salud = await prisma.saludAlumno.findFirstOrThrow();
    expect(salud.alergiasMedicamentos).toBe("Penicilina");
  });

  it("no se puede rechazar una solicitud ya aprobada", async () => {
    const { id, token } = await crearEnlace();
    await publico.enviarSolicitud(token, datosFormulario);
    await acciones.aprobarSolicitud(id, { anoEscolarId: anoId, gradoId }).catch(() => {});
    await expect(acciones.rechazarSolicitud(id)).rejects.toThrow("ya fue procesada");
  });

  it("revocar solo borra enlaces sin usar", async () => {
    const pendiente = await crearEnlace();
    const enviado = await crearEnlace();
    await publico.enviarSolicitud(enviado.token, datosFormulario);
    await acciones.revocarEnlaceSolicitud(pendiente.id);
    await acciones.revocarEnlaceSolicitud(enviado.id);
    expect(await prisma.solicitudInscripcion.count()).toBe(1);
  });
});
