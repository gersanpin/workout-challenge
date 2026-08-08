import { Link } from "@/i18n/navigation";

export default function NotFound() {
  return (
    <div className="page">
      <div className="container">
        <h1 className="section-title">404</h1>
        <p className="section-lead">Page not found.</p>
        <p style={{ marginTop: "1.5rem" }}>
          <Link href="/" className="btn btn-line">
            Santiago Architecture
          </Link>
        </p>
      </div>
    </div>
  );
}
