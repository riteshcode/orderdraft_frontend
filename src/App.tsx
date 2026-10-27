import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { auth } from '@/lib/api'
import { useMe } from '@/hooks/useMe'
import type { Role } from '@/lib/types'
import { AppLayout } from '@/components/layout/AppLayout'
import { Spinner } from '@/components/ui/misc'

// Pages lazy load - pehli load fast
const Landing = lazy(() => import('@/pages/Landing'))
const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const AcceptInvite = lazy(() => import('@/pages/auth/AcceptInvite'))
const Dashboard = lazy(() => import('@/pages/Dashboard'))
const OrdersList = lazy(() => import('@/pages/orders/OrdersList'))
const OrderReview = lazy(() => import('@/pages/orders/OrderReview'))
const NewOrder = lazy(() => import('@/pages/orders/NewOrder'))
const Inbox = lazy(() => import('@/pages/Inbox'))
const InvoicesList = lazy(() => import('@/pages/invoices/InvoicesList'))
const InvoiceDetail = lazy(() => import('@/pages/invoices/InvoiceDetail'))
const InvoiceForm = lazy(() => import('@/pages/invoices/InvoiceForm'))
const Products = lazy(() => import('@/pages/catalog/Products'))
const Customers = lazy(() => import('@/pages/catalog/Customers'))
const CustomerDetail = lazy(() => import('@/pages/catalog/CustomerDetail'))
const ProductLabels = lazy(() => import('@/pages/catalog/ProductLabels'))
const Stock = lazy(() => import('@/pages/catalog/Stock'))
const Suppliers = lazy(() => import('@/pages/purchasing/Suppliers'))
const SupplierDetail = lazy(() => import('@/pages/purchasing/SupplierDetail'))
const PurchaseOrders = lazy(() => import('@/pages/purchasing/PurchaseOrders'))
const PurchaseOrderForm = lazy(() => import('@/pages/purchasing/PurchaseOrderForm'))
const PurchaseOrderDetail = lazy(() => import('@/pages/purchasing/PurchaseOrderDetail'))
const ReorderSuggestions = lazy(() => import('@/pages/purchasing/ReorderSuggestions'))
const ReceiveWithoutPO = lazy(() => import('@/pages/purchasing/ReceiveWithoutPO'))
const Imports = lazy(() => import('@/pages/imports/Imports'))
const Destinations = lazy(() => import('@/pages/destinations/Destinations'))
const ExportLog = lazy(() => import('@/pages/destinations/ExportLog'))
const Integrations = lazy(() => import('@/pages/Integrations'))
const Settings = lazy(() => import('@/pages/settings/Settings'))
const Categories = lazy(() => import('@/pages/catalog/Categories'))
const ProductDetail = lazy(() => import('@/pages/catalog/ProductDetail'))
const Reports = lazy(() => import('@/pages/Reports'))
const AdminAnnouncements = lazy(() => import('@/pages/admin/AdminAnnouncements'))
const PortalLogin = lazy(() => import('@/pages/portal/PortalAuth').then((m) => ({ default: m.PortalLogin })))
const PortalForgot = lazy(() => import('@/pages/portal/PortalAuth').then((m) => ({ default: m.PortalForgot })))
const PortalReset = lazy(() => import('@/pages/portal/PortalAuth').then((m) => ({ default: m.PortalReset })))
const PortalApp = lazy(() => import('@/pages/portal/PortalApp'))
const named = <K extends string>(loader: () => Promise<Record<K, React.ComponentType>>, name: K) =>
  lazy(() => loader().then((m) => ({ default: m[name] })))
const shop = () => import('@/pages/portal/PortalShop')
const cartPages = () => import('@/pages/portal/PortalCart')
const orderPages = () => import('@/pages/portal/PortalOrders')
const PortalHome = named(shop, 'PortalHome')
const PortalShopList = named(shop, 'PortalShopList')
const PortalProductPage = named(shop, 'PortalProductPage')
const PortalCartPage = named(cartPages, 'PortalCartPage')
const PortalCheckout = named(cartPages, 'PortalCheckout')
const PortalOrderPlaced = named(cartPages, 'PortalOrderPlaced')
const PortalOrdersPage = named(orderPages, 'PortalOrdersPage')
const PortalOrderDetail = named(orderPages, 'PortalOrderDetail')
const PortalProfilePage = named(orderPages, 'PortalProfilePage')
const PortalChangePassword = named(orderPages, 'PortalChangePassword')
const PortalNotificationsPage = named(orderPages, 'PortalNotificationsPage')
const PortalStandingPage = lazy(() => import('@/pages/portal/PortalStanding'))
const PortalAccountPage = lazy(() => import('@/pages/portal/PortalAccount'))
const PortalImpersonate = named(orderPages, 'PortalImpersonate')
const ActivityLog = lazy(() => import('@/pages/ActivityLog'))
const HelpCenter = lazy(() => import('@/pages/HelpCenter'))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'))
const AdminTenants = lazy(() => import('@/pages/admin/AdminTenants'))
const AdminTenantDetail = lazy(() => import('@/pages/admin/AdminTenantDetail'))
const AdminPlans = lazy(() => import('@/pages/admin/AdminPlans'))

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center text-muted-foreground">
      <Spinner />
    </div>
  )
}

/** Login zaroori + optional role check */
function Private({
  children,
  roles,
  superadmin,
  bare,
}: {
  children: ReactNode
  roles?: Role[]
  superadmin?: boolean
  bare?: boolean // sidebar ke bina (print pages)
}) {
  const { data: me, isLoading } = useMe()
  if (!auth.getToken()) return <Navigate to="/login" replace />
  if (isLoading || !me) return <PageLoader />
  if (superadmin && (!me.is_superadmin || me.impersonating)) return <Navigate to="/" replace />
  if (roles && !roles.includes(me.role)) return <Navigate to="/" replace />
  if (bare) return <Suspense fallback={<PageLoader />}>{children}</Suspense>
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>{children}</Suspense>
    </AppLayout>
  )
}

const MANAGERS: Role[] = ['owner', 'admin']

/** "/" - login hai to Dashboard, warna marketing homepage */
function Home() {
  if (!auth.getToken()) return <Landing />
  return (
    <Private>
      <Dashboard />
    </Private>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/accept-invite" element={<AcceptInvite />} />

        {/* Customer portal (business ke customers) - staff login se alag. Auth pages frame ke bahar */}
        <Route path="/portal/:slug/login" element={<PortalLogin />} />
        <Route path="/portal/:slug/forgot-password" element={<PortalForgot />} />
        <Route path="/portal/:slug/reset-password" element={<PortalReset />} />
        <Route path="/portal/:slug/change-password" element={<PortalChangePassword />} />
        <Route path="/portal/:slug/impersonate" element={<PortalImpersonate />} />
        <Route path="/portal/:slug" element={<PortalApp />}>
          <Route index element={<PortalHome />} />
          <Route path="shop" element={<PortalShopList />} />
          <Route path="p/:id" element={<PortalProductPage />} />
          <Route path="cart" element={<PortalCartPage />} />
          <Route path="checkout" element={<PortalCheckout />} />
          <Route path="order-placed/:id" element={<PortalOrderPlaced />} />
          <Route path="orders" element={<PortalOrdersPage />} />
          <Route path="orders/:id" element={<PortalOrderDetail />} />
          <Route path="profile" element={<PortalProfilePage />} />
          <Route path="notifications" element={<PortalNotificationsPage />} />
          <Route path="standing" element={<PortalStandingPage />} />
          <Route path="account" element={<PortalAccountPage />} />
        </Route>

        {/* App */}
        <Route path="/" element={<Home />} />
        <Route
          path="/orders"
          element={
            <Private>
              <OrdersList />
            </Private>
          }
        />
        <Route
          path="/orders/new"
          element={
            <Private>
              <NewOrder />
            </Private>
          }
        />
        <Route
          path="/orders/:id"
          element={
            <Private>
              <OrderReview />
            </Private>
          }
        />
        <Route
          path="/inbox"
          element={
            <Private>
              <Inbox />
            </Private>
          }
        />
        <Route
          path="/invoices"
          element={
            <Private>
              <InvoicesList />
            </Private>
          }
        />
        <Route
          path="/invoices/new"
          element={
            <Private roles={MANAGERS}>
              <InvoiceForm />
            </Private>
          }
        />
        <Route
          path="/invoices/:id"
          element={
            <Private>
              <InvoiceDetail />
            </Private>
          }
        />
        <Route
          path="/invoices/:id/edit"
          element={
            <Private roles={MANAGERS}>
              <InvoiceForm key="edit" />
            </Private>
          }
        />
        <Route
          path="/products/labels"
          element={
            <Private bare>
              <ProductLabels />
            </Private>
          }
        />
        <Route
          path="/suppliers"
          element={
            <Private>
              <Suppliers />
            </Private>
          }
        />
        <Route
          path="/suppliers/:id"
          element={
            <Private>
              <SupplierDetail />
            </Private>
          }
        />
        <Route
          path="/purchase-orders"
          element={
            <Private>
              <PurchaseOrders />
            </Private>
          }
        />
        <Route
          path="/purchase-orders/new"
          element={
            <Private roles={MANAGERS}>
              <PurchaseOrderForm />
            </Private>
          }
        />
        <Route
          path="/purchase-orders/suggestions"
          element={
            <Private roles={MANAGERS}>
              <ReorderSuggestions />
            </Private>
          }
        />
        <Route
          path="/purchase-orders/:id"
          element={
            <Private>
              <PurchaseOrderDetail />
            </Private>
          }
        />
        <Route
          path="/purchase-orders/:id/edit"
          element={
            <Private roles={MANAGERS}>
              <PurchaseOrderForm />
            </Private>
          }
        />
        <Route
          path="/stock-receipts/new"
          element={
            <Private roles={MANAGERS}>
              <ReceiveWithoutPO />
            </Private>
          }
        />
        <Route
          path="/stock"
          element={
            <Private>
              <Stock />
            </Private>
          }
        />
        <Route
          path="/products"
          element={
            <Private>
              <Products />
            </Private>
          }
        />
        <Route
          path="/customers"
          element={
            <Private>
              <Customers />
            </Private>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <Private>
              <CustomerDetail />
            </Private>
          }
        />
        <Route
          path="/imports"
          element={
            <Private roles={MANAGERS}>
              <Imports />
            </Private>
          }
        />
        <Route
          path="/destinations"
          element={
            <Private roles={MANAGERS}>
              <Destinations />
            </Private>
          }
        />
        <Route
          path="/exports"
          element={
            <Private roles={MANAGERS}>
              <ExportLog />
            </Private>
          }
        />
        <Route
          path="/categories"
          element={
            <Private>
              <Categories />
            </Private>
          }
        />
        <Route
          path="/products/:id"
          element={
            <Private>
              <ProductDetail />
            </Private>
          }
        />
        <Route
          path="/reports"
          element={
            <Private>
              <Reports />
            </Private>
          }
        />
        <Route
          path="/admin/announcements"
          element={
            <Private superadmin>
              <AdminAnnouncements />
            </Private>
          }
        />
        <Route
          path="/activity"
          element={
            <Private roles={MANAGERS}>
              <ActivityLog />
            </Private>
          }
        />
        <Route
          path="/help"
          element={
            <Private>
              <HelpCenter />
            </Private>
          }
        />
        <Route
          path="/help/:slug"
          element={
            <Private>
              <HelpCenter />
            </Private>
          }
        />
        <Route
          path="/integrations"
          element={
            <Private roles={MANAGERS}>
              <Integrations />
            </Private>
          }
        />
        <Route path="/settings" element={<Navigate to="/settings/general" replace />} />
        <Route
          path="/settings/:tab"
          element={
            <Private>
              <Settings />
            </Private>
          }
        />

        {/* Super admin */}
        <Route
          path="/admin"
          element={
            <Private superadmin>
              <AdminDashboard />
            </Private>
          }
        />
        <Route
          path="/admin/tenants"
          element={
            <Private superadmin>
              <AdminTenants />
            </Private>
          }
        />
        <Route
          path="/admin/tenants/:id"
          element={
            <Private superadmin>
              <AdminTenantDetail />
            </Private>
          }
        />
        <Route
          path="/admin/plans"
          element={
            <Private superadmin>
              <AdminPlans />
            </Private>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
