export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Welcome To Kisaan Saathi</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-white rounded shadow">Total Fields: 120</div>
        <div className="p-4 bg-white rounded shadow">Avg NDVI: 0.67</div>
        <div className="p-4 bg-white rounded shadow">Active Alerts: 4</div>
      </div>

      <div className="mt-6 p-4 bg-white rounded shadow">
        <h2 className="text-xl font-semibold mb-2">Recent Activity</h2>
        <ul className="space-y-2">
          <li>Field A updated</li>
          <li>New Soil Sample added</li>
          <li>NDVI refreshed</li>
        </ul>
      </div>
    </div>
  );
}
