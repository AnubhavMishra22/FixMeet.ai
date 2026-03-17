import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../../components/ui/card';

export default function DemoPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Custom Demo</h1>
        <p className="text-slate-600">Configured demo links for custom showcases.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Demo Links</CardTitle>
          <CardDescription>Quick access to live demo destinations.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="divide-y rounded-md border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">
                  1
                </span>
                <span className="font-medium text-slate-900">Inductive Automation</span>
              </div>
              <a
                href="https://meetiademo.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-primary hover:underline"
              >
                meetiademo.vercel.app
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
