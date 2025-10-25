import { Link } from 'react-router-dom';
import Button from '../ui/Button.jsx';
import { Card, CardBody } from '../ui/Card.jsx';

const navItems = [
  { to: '/admin', title: 'Admin', desc: 'Manage registrations, readers & monitoring' },
  { to: '/admin/analytics', title: 'Analytics', desc: 'Live & range crowd metrics' },
  { to: '/admin/game-lite', title: 'Game Configuration', desc: 'Cluster scoring & redemption' },
  { to: '/admin/exitout', title: 'Exit Stack', desc: 'Manage exit stack & reconciliation' },
  { to: '/kiosk', title: 'Kiosks', desc: 'Cluster directory & live kiosk views' },
  { to: '/registration', title: 'Registration', desc: 'Portal selection & team registration', internal: true }
];

export default function Home(){
  return (
    <div className="space-y-10">
      <section className="text-center space-y-4">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-sky-300 to-cyan-200 text-transparent bg-clip-text">RFID Crowd Management System</h1>
        <p className="text-white/70 max-w-2xl mx-auto">Unified entry point for administration, analytics, registration, kiosk displays and game-lite features.</p>
      </section>

      <section>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {navItems.map(item => (
            <Card key={item.to} className="group hover:border-cyan-400/40 transition-colors">
              <CardBody className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <h2 className="text-lg font-semibold text-white/90 group-hover:text-white">{item.title}</h2>
                </div>
                <p className="text-sm text-white/60 leading-relaxed">{item.desc}</p>
                <div className="mt-auto pt-2">
                  <Link to={item.to} className="inline-block">
                    <Button size="sm" variant="accent">Open</Button>
                  </Link>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <section className="text-xs text-white/40 text-center pt-4 border-t border-white/10">
        Build time: {import.meta.env.VITE_BUILD_TIME || 'n/a'} • API: {import.meta.env.VITE_API_BASE}
      </section>
    </div>
  );
}
