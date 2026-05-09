export default function AppFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <p className="site-footer-copy">
        &copy; {year} crazysilvershine. All rights reserved.
      </p>
    </footer>
  );
}
