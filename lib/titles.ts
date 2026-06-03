/**
 * Shared dashboard title resolution.
 * Used by both the desktop sidebar layout and mobile layout header
 * to display a consistent page title based on the current route.
 */
export function getDashboardTitle(pathname: string): string {
  if (pathname === "/dashboard/admin") return "Admin Dashboard"
  if (pathname === "/dashboard/manager") return "Manager Dashboard"
  if (pathname === "/dashboard/staff") return "Staff Counter"
  if (pathname === "/dashboard/faculty") return "Faculty Dashboard"
  if (pathname === "/dashboard/student") return "Student Dashboard"
  if (pathname === "/dashboard/order") return "Place Order"
  if (pathname.includes("/student/menu") || pathname.includes("/faculty/menu")) return "Menu"
  if (pathname.includes("/inventory")) return "Inventory Management"
  if (pathname.includes("/menu")) return "Menu Management"
  if (pathname.includes("/salary")) return "Salary Deductions"
  if (pathname.includes("/orders")) return "Orders"
  if (pathname.includes("/credits")) return "Credits"
  if (pathname.includes("/reports")) return "Reports"
  if (pathname.includes("/users")) return "Users"
  if (pathname.includes("/settings")) return "Settings"
  return "Dashboard"
}
