import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Building2, ArrowRight, Package, TrendingUp, Calendar, MapPin, Truck, ChevronRight, Check } from "lucide-react";
import { api } from "../lib/api";
import { useApp } from "../context/AppContext";

type OrderItem = {
  orderNumber: string;
  grandTotal: number;
  status: string;
  createdAt: string;
  items: any[];
  _id: string;
};

type ProjectDetail = {
  _id: string;
  name: string;
  description?: string;
  location?: string;
  budget?: number;
  status: string;
  totalOrders: number;
  totalSpend: number;
  totalProducts: number;
  orders: OrderItem[];
};

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const { isLoggedIn } = useApp();
  const navigate = useNavigate();
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      navigate("/login");
      return;
    }
    if (id) {
      loadProject(id);
    }
  }, [id, isLoggedIn, navigate]);

  const loadProject = (projectId: string) => {
    setLoading(true);
    api.getProjectDetails(projectId)
      .then((res: any) => {
        setProject(res.data);
      })
      .catch((err) => {
        console.error(err);
        navigate("/projects");
      })
      .finally(() => setLoading(false));
  };

  if (loading) {
    return <div className="text-center py-20 text-gray-500 min-h-screen bg-gray-50">Loading project details...</div>;
  }

  if (!project) return null;

  return (
    <div className="bg-gray-50 min-h-screen pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 flex-wrap">
          <Link to="/dashboard" className="hover:text-black">Dashboard</Link>
          <ArrowRight className="w-4 h-4" />
          <Link to="/projects" className="hover:text-black">My Projects</Link>
          <ArrowRight className="w-4 h-4" />
          <span className="text-black font-medium">{project.name}</span>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm mb-6 flex flex-col md:flex-row gap-6 justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-[#E85A00]/10 flex items-center justify-center shrink-0">
                <Building2 className="w-6 h-6 text-[#E85A00]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-black">{project.name}</h1>
                <span className={`inline-block mt-1 text-xs font-semibold px-2.5 py-1 rounded-md ${
                  project.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                  project.status === 'COMPLETED' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {project.status}
                </span>
              </div>
            </div>
            {project.description && <p className="text-gray-600 max-w-2xl text-sm">{project.description}</p>}
            
            <div className="flex flex-wrap gap-4 mt-4">
              {project.location && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" /> {project.location}
                </div>
              )}
              {project.budget && (
                <div className="flex items-center gap-1.5 text-sm text-gray-500">
                  <TrendingUp className="w-4 h-4" /> Budget: ₹{project.budget.toLocaleString("en-IN")}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-4 md:gap-8 bg-gray-50 p-4 rounded-xl border border-gray-100 w-full md:w-auto">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Total Orders</p>
              <p className="font-bold text-xl">{project.totalOrders}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">Total Spend</p>
              <p className="font-bold text-xl text-[#E85A00]">₹{project.totalSpend.toLocaleString("en-IN")}</p>
            </div>
          </div>
        </div>

        {/* Orders List */}
        <h2 className="text-lg font-bold text-black mb-4">Assigned Orders</h2>
        
        {project.orders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No orders assigned to this project.</p>
            <p className="text-sm text-gray-400 mt-1">Go to My Orders in your dashboard to assign an order to this project.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {project.orders.map(order => (
              <div key={order._id} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-black text-lg">{order.orderNumber}</span>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md">
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(order.createdAt).toLocaleDateString()}</span>
                      <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {order.items.length} items</span>
                    </div>
                  </div>
                  
                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-0.5">Order Total</p>
                    <p className="font-bold text-lg text-[#E85A00]">₹{order.grandTotal.toLocaleString("en-IN")}</p>
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-4 mt-2 flex justify-between items-center">
                  <p className="text-sm text-gray-500 line-clamp-1">
                    {order.items.map(i => i.name).join(', ')}
                  </p>
                  <Link 
                    to={`/orders/${order._id}`}
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#E85A00] hover:text-[#CC4E00] whitespace-nowrap"
                  >
                    View Details <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
