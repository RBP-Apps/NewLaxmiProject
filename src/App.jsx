
import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import Home from '@/pages/Home';

// Layouts
import DashboardLayout from '@/pages/dashboard/layout';
import FoundationLayout from '@/pages/foundation/layout';
import InstallationLayout from '@/pages/installation/layout';
import InsuranceLayout from '@/pages/insurance/layout';
import JccCompletionLayout from '@/pages/jcc-completion/layout';
import JccStatusLayout from '@/pages/jcc-status/layout';
import BeneficiaryShareLayout from '@/pages/beneficiary-share/layout';
import InsurancesLayout from '@/pages/insurances/layout';
import PaymentLayout from '@/pages/payment/layout';
import PortalLayout from '@/pages/portal/layout';
import SurveyLayout from '@/pages/survey/layout';
import SystemInfoLayout from '@/pages/system-info/layout';
import SettingLayout from '@/pages/setting/layout';
import PortalUpdateLayout from '@/pages/portal-update/layout';


// Pages
import DashboardPage from '@/pages/dashboard/page';
import FoundationPage from '@/pages/foundation/page';
import InstallationPage from '@/pages/installation/page';
import InsurancePage from '@/pages/insurance/page';
import JccCompletionPage from '@/pages/jcc-completion/page';
import JccStatusPage from '@/pages/jcc-status/page';
import BeneficiarySharePage from '@/pages/beneficiary-share/page';
import InsurancesPage from '@/pages/insurances/page';
import LoginPage from '@/pages/login/page';
import LoiMrPage from '@/pages/work-order/page'; // Restored
import PaymentPage from '@/pages/payment/page';
import PortalPage from '@/pages/portal/page';
import SurveyPage from '@/pages/survey/page';
import SystemInfoPage from '@/pages/system-info/page';
import SettingPage from '@/pages/setting/page';
import LoiMrLayout from '@/pages/work-order/layout'; // Restored
import PortalUpdatePage from '@/pages/portal-update/page';

function App() {
     return (
          <Router>
               <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<LoginPage />} />

                    <Route path="/dashboard" element={<DashboardLayout><Outlet /></DashboardLayout>}>
                         <Route index element={<DashboardPage />} />
                    </Route>

                    <Route path="/foundation" element={<FoundationLayout><Outlet /></FoundationLayout>}>
                         <Route index element={<FoundationPage />} />
                    </Route>

                    <Route path="/installation" element={<InstallationLayout><Outlet /></InstallationLayout>}>
                         <Route index element={<InstallationPage />} />
                    </Route>

                    <Route path="/insurance" element={<InsuranceLayout><Outlet /></InsuranceLayout>}>
                         <Route index element={<InsurancePage />} />
                    </Route>

                    <Route path="/jcc-completion" element={<JccCompletionLayout><Outlet /></JccCompletionLayout>}>
                         <Route index element={<JccCompletionPage />} />
                    </Route>

                    <Route path="/jcc-status" element={<JccStatusLayout><Outlet /></JccStatusLayout>}>
                         <Route index element={<JccStatusPage />} />
                    </Route>

                    <Route path="/beneficiary-share" element={<BeneficiaryShareLayout><Outlet /></BeneficiaryShareLayout>}>
                         <Route index element={<BeneficiarySharePage />} />
                    </Route>

                    <Route path="/insurances" element={<InsurancesLayout><Outlet /></InsurancesLayout>}>
                         <Route index element={<InsurancesPage />} />
                    </Route>

                    <Route path="/work-order" element={<LoiMrLayout><Outlet /></LoiMrLayout>}>
                         <Route index element={<LoiMrPage />} />
                    </Route>

                    <Route path="/payment" element={<PaymentLayout><Outlet /></PaymentLayout>}>
                         <Route index element={<PaymentPage />} />
                    </Route>

                    <Route path="/portal" element={<PortalLayout><Outlet /></PortalLayout>}>
                         <Route index element={<PortalPage />} />
                    </Route>

                    <Route path="/portal-update" element={<PortalUpdateLayout><Outlet /></PortalUpdateLayout>}>
                         <Route index element={<PortalUpdatePage />} />
                    </Route>

                    <Route path="/survey" element={<SurveyLayout><Outlet /></SurveyLayout>}>
                         <Route index element={<SurveyPage />} />
                    </Route>

                    <Route path="/system-info" element={<SystemInfoLayout><Outlet /></SystemInfoLayout>}>
                         <Route index element={<SystemInfoPage />} />
                    </Route>

                    <Route path="/setting" element={<SettingLayout><Outlet /></SettingLayout>}>
                         <Route index element={<SettingPage />} />
                    </Route>

               </Routes>
          </Router>
     );
}

export default App;