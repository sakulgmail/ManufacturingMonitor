export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-gray-100 border-t py-4 text-center text-gray-600 text-sm">
      <div className="container mx-auto px-4">
        <p>© {currentYear} Factory Maintenance System | Version 1.0</p>
      </div>
    </footer>
  );
}
