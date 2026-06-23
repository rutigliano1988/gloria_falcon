export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-gray-50">
      {children}
    </div>
  );
}
