import React, { useState, useEffect } from 'react';
import { Package, Plus, FileText, Calendar, User, LogOut, CheckCircle, X, Clock, AlertCircle, DollarSign, RefreshCw, Bell } from 'lucide-react';
import { createTestOrder, getAllTestOrders } from '../../services/testOrderService';
import { requestNotificationPermission, messaging, onMessage } from '../../config/firebase';
import { getAllNotifications, markNotificationAsRead } from '../../services/notificationService';
const AdminDashboard = () => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    createdBy: '',
    manufacturer: '',
    partNumber: '',
    testsToPerform: '',
    clientDeadline: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Orders state
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);


  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [awb, setAwb] = useState("");
  const [dispatchDate, setDispatchDate] = useState("");
  const [logisticSaving, setLogisticSaving] = useState(false);
  const [logisticError, setLogisticError] = useState("");
  const [logisticSuccess, setLogisticSuccess] = useState("");


  //verify payment 
  const verifyPayment = async () => {
    try {
      const authToken = localStorage.getItem("authToken");

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/admin/bill-status/${selectedOrder.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Payment verification failed");
      }

      await openOrderDetails(selectedOrder.id);
      fetchOrders();
    } catch (err) {
      alert(err.message || "Something went wrong");
    }
  };

  //upload awb and dispatch date
  const saveLogistics = async () => {
    if (!awb || !dispatchDate) {
      setLogisticError("AWB and Dispatch Date are required");
      return;
    }

    setLogisticSaving(true);
    setLogisticError("");
    setLogisticSuccess("");

    try {
      const authToken = localStorage.getItem("authToken");

      const params = new URLSearchParams({
        awb,
        dispatchDate
      });

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || "http://localhost:8080/api"}/admin/logistic/${selectedOrder.id}?${params}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save logistics");
      }

      setLogisticSuccess("AWB & dispatch date saved successfully");

      await openOrderDetails(selectedOrder.id);
      fetchOrders();
    } catch (err) {
      setLogisticError(err.message || "Something went wrong");
    } finally {
      setLogisticSaving(false);
    }
  };

  //handle mark complete
  const handleVerifyReport = async (testPassed) => {
    if (!selectedOrder?.id) return;

    try {
      const token = localStorage.getItem("authToken");

      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/admin/verify/${selectedOrder.id}?testPassed=${testPassed}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) throw new Error("Verification failed");

      // Refresh details + list
      await openOrderDetails(selectedOrder.id);
      fetchOrders();

      alert(
        testPassed
          ? "Test Order marked as COMPLETED – PASS"
          : "Test Order marked as COMPLETED – FAIL"
      );
    } catch (err) {
      console.error(err);
      alert("Failed to verify test report");
    }
  };


  //admin notification
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  //checking for report and in progress test order

  const hasReports = selectedOrder?.files?.some(
    (f) => f.fileType === "REPORTS"
  );

  const canVerifyReport =
    selectedOrder?.status === "IN_PROGRESS" && hasReports;

  //handle approve
  const handleApprove = async () => {
    if (!selectedOrder?.id) return;

    const authToken = localStorage.getItem("authToken");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/admin/approval/${selectedOrder.id}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Approval failed");
      }

      // Refresh order details + list
      await openOrderDetails(selectedOrder.id);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert("Failed to approve test order");
    }
  };

  const canApprove =
    Boolean(selectedOrder?.testingDetails?.labEta) &&
    selectedOrder?.status === "PENDING_APPROVAL";



  //fetch order details 
  const openOrderDetails = async (id) => {
    const authToken = localStorage.getItem('authToken');

    if (!id) return;

    const res = await fetch(
      `${process.env.REACT_APP_API_URL}/user/get-testorder/${id}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    if (!res.ok) return;

    const data = await res.json();
    setSelectedOrder(data);
  };


  // Fetch all test orders
  const fetchOrders = async () => {
    setLoadingOrders(true);
    setOrdersError('');

    try {
      const data = await getAllTestOrders();
      setOrders(data);
    } catch (error) {
      setOrdersError(error.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Fetch orders on component mount
  useEffect(() => {
    requestNotificationPermission();

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("FCM message received:", payload);

      const { title, body } = payload.notification || {};
      const orderId = payload.data?.orderId;

      if (!orderId) return;

      setNotifications((prev) => [
        {
          title,
          body,
          testOrderId: orderId,
          read: false,
        },
        ...prev,
      ]);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.createdBy.trim()) {
      setError('Created by field is required');
      return false;
    }
    if (!formData.manufacturer.trim()) {
      setError('Manufacturer is required');
      return false;
    }
    if (!formData.partNumber.trim()) {
      setError('Part number is required');
      return false;
    }
    if (!formData.testsToPerform.trim()) {
      setError('Tests to perform is required');
      return false;
    }
    if (!formData.clientDeadline) {
      setError('Client deadline is required');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!validateForm()) return;

    setLoading(true);

    try {
      const requestBody = {
        createdBy: formData.createdBy,
        partDetails: {
          manufacturer: formData.manufacturer,
          partNumber: formData.partNumber
        },
        testingDetails: {
          testsToPerform: formData.testsToPerform,
          clientDeadline: formData.clientDeadline
        }
      };

      await createTestOrder(requestBody);

      setSuccess(true);

      setFormData({
        createdBy: '',
        manufacturer: '',
        partNumber: '',
        testsToPerform: '',
        clientDeadline: ''
      });

      // Refresh orders list
      fetchOrders();

      setTimeout(() => {
        setShowCreateModal(false);
        setSuccess(false);
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    window.location.href = '/login';
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'AWAITING_PARTS': { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      'IN_PROGRESS': { color: 'bg-blue-100 text-blue-800', icon: FileText },
      'COMPLETED': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      COMPLETED_PASS: {
        color: "bg-green-100 text-green-800",
        icon: CheckCircle,
      },
      ON_HOLD: {
        color: "bg-orange-100 text-orange-800",
        icon: Clock
      },
      COMPLETED_FAIL: {
        color: "bg-red-100 text-red-800",
        icon: X,
      },
      'DISPATCHED': { color: 'bg-blue-100 text-blue-800', icon: Package },

      CLOSED: { color: "bg-green-800 text-green-100 border-green-900", icon: CheckCircle },


    };

    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.replace(/_/g, ' ')}
      </span>
    );
  };

  const getBillingBadge = (billingStatus) => {
    let color = 'bg-gray-100 text-gray-800';

    if (billingStatus === 'INVOICED') {
      color = 'bg-green-100 text-green-800';
    }

    if (billingStatus === 'PAID') {
      color = 'bg-green-800 text-green-100';
    }

    return (
      <span
        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${color}`}
      >
        <DollarSign className="w-3 h-3" />
        {billingStatus}
      </span>
    );
  };


  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate stats from orders
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'AWAITING_PARTS' || o.status === 'IN_PROGRESS' || o.status === 'ON_HOLD').length,
    completed: orders.filter(o => o.status === 'COMPLETED_PASS' || o.status === 'COMPLETED_FAIL' || o.status === 'CLOSED').length
  };

  return (
    //<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="min-h-screen bg-gray-50">
      {/* <div className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">*/}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap3">
              { /* <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center"> */}
              <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">

                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Lab Testing Portal</h1>
                <p className="text-xs text-gray-500">Admin Dashboard</p>
              </div>
              
            </div>
            <div className="flex items-center gap-4"> 
                <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-full hover:bg-gray-100"
            >
              <Bell className="w-6 h-6 text-gray-700" />

              {notifications.some(n => !n.read) && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <User className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Log Out</span>
            </button>


          

</div>
          </div>

        </div>
      </div>
      {showNotifications && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded-lg shadow-lg z-50">
          <div className="p-3 border-b text-sm font-semibold">
            Notifications
          </div>

          {notifications.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No notifications</p>
          ) : (
            notifications.map((n, index) => (
              <div
                key={index}
                onClick={() => {
                  setShowNotifications(false);

                  // mark as read
                  setNotifications(prev =>
                    prev.map((item, i) =>
                      i === index ? { ...item, read: true } : item
                    )
                  );

                  // OPEN ORDER DETAILS (IMPORTANT)
                  openOrderDetails(n.testOrderId);
                }}
                className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 ${n.read ? "text-gray-500" : "text-gray-900 font-medium"
                  }`}
              >
                <p>{n.title}</p>
                <p className="text-xs text-gray-500 mt-1">{n.body}</p>
              </div>
            ))
          )}
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome, Admin</h2>
          <p className="text-gray-600">Manage test orders and monitor lab activities</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
           <div className="bg-white rounded-xl shadow-md p-6"> 

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              {/*<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">*/}
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Tests</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>

        {!selectedOrder ? (
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-1">Test Orders</h3>
                <p className="text-sm text-gray-600">View and manage all test orders</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={fetchOrders}
                  disabled={loadingOrders}
                  //  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-100 transition"

                >
                  <RefreshCw className={`w-5 h-5 ${loadingOrders ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  // className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition"

                >
                  <Plus className="w-5 h-5" />
                  Create New Order
                </button>
              </div>
            </div>

            {loadingOrders && (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                <p className="mt-4 text-gray-600">Loading orders...</p>
              </div>
            )}

            {!loadingOrders && ordersError && (
              <div className="border border-red-200 rounded-lg p-8 text-center bg-red-50">
                <X className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <p className="text-red-600 mb-2">Failed to load orders</p>
                <p className="text-sm text-red-500 mb-4">{ordersError}</p>
                <button
                  onClick={fetchOrders}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}

            {!loadingOrders && !ordersError && orders.length === 0 && (
              <div className="border border-gray-200 rounded-lg p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600 mb-2">No test orders yet</p>
                <p className="text-sm text-gray-500">Create your first test order to get started</p>
              </div>
            )}

            {/* Orders Table */}
            {/* <div className="overflow-x-auto">*/}
            {!loadingOrders && !ordersError && orders.length > 0 && (
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  {/*<thead className="bg-gray-50 border-b border-gray-200">*/}
                  <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Details</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tests</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                    </tr>
                  </thead>


                  <tbody className="bg-white divide-y divide-gray-200">
                    {orders.map((order, index) => (
                      <tr
                        key={order.id}
                        onClick={() => openOrderDetails(order.id)}
                        //className="cursor-pointer hover:bg-indigo-50 transition"
                        className="cursor-pointer hover:bg-gray-50 transition"

                      >
                        {/*<td className="px-4 py-4">*/}
                        <td className="px-4 py-3 text-sm text-gray-700">
                          <div className="text-sm text-gray-900 font-medium">{order.partDetails?.manufacturer || 'N/A'}</div>
                          <div className="text-xs text-gray-500">{order.partDetails?.partNumber || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm text-gray-900 max-w-xs truncate">
                            {order.testingDetails?.testsToPerform || 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {order.testingDetails?.clientDeadline ? formatDate(order.testingDetails.clientDeadline) : 'N/A'}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(order.status || 'AWAITING_PARTS')}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getBillingBadge(order.paymentInvoice?.billingStatus || 'UNINVOICED')}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{order.createdBy?.name || 'Unknown'}</div>
                        </td>

                      </tr>

                    ))}


                  </tbody>
                </table>
              </div>


            )

            }
          </div>
        ) : (
          /* ORDER DETAILS VIEW */
          <div className="bg-white rounded-xl shadow-md p-6 space-y-6">

            {/* Back */}
            <button
              onClick={() => setSelectedOrder(null)}
              className="text-sm text-indigo-600 hover:underline"
            >
              ← Back to Test Orders
            </button>

            {/* Header */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Test Order Details</h2>
              <p className="text-sm text-gray-500">Order ID: {selectedOrder.id}</p>
            </div>

            {/* Status */}
            <div className="flex gap-4">
              <span className="px-3 py-1 rounded-full text-sm bg-yellow-100 text-yellow-800">
                {selectedOrder.status}
              </span>
              <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700">
                {selectedOrder.paymentInvoice?.billingStatus}
              </span>
            </div>

            {/* Created By */}
            {/* <div className="border rounded-lg p-4">*/}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Created By</h3>
              <p className="text-sm font-medium">{selectedOrder.createdBy?.name}</p>
              <p className="text-sm text-gray-600">{selectedOrder.createdBy?.role}</p>
            </div>

            {/* Part Details */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Part Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Manufacturer</span>
                  <p className="font-medium">{selectedOrder.partDetails?.manufacturer}</p>
                </div>
                <div>
                  <span className="text-gray-500">Part Number</span>
                  <p className="font-medium">{selectedOrder.partDetails?.partNumber}</p>
                </div>
                <div>
                  <span className="text-gray-500">Quantity Received</span>
                  <p className="font-medium">{selectedOrder.partDetails?.quantityReceived}</p>
                </div>
                <div>
                  <span className="text-gray-500">Date Received</span>
                  <p className="font-medium">
                    {selectedOrder.partDetails?.dateReceived || "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Testing Details */}
            <div className="border rounded-lg p-4 bg-blue-50">
              <p className="text-xs text-blue-700 mb-3">Testing Details</p>

              <p className="text-sm mb-2">
                <span className="text-gray-600">Tests:</span>{" "}
                <span className="font-medium">
                  {selectedOrder.testingDetails?.testsToPerform}
                </span>
              </p>

              <p className="text-sm mb-2">
                <span className="text-gray-600">Client Deadline:</span>{" "}
                <span className="font-medium">
                  {new Date(selectedOrder.testingDetails?.clientDeadline).toLocaleString()}
                </span>
              </p>

              <p className="text-sm">
                <span className="text-gray-600">Lab ETA:</span>{" "}
                <span className="font-medium text-blue-900">
                  {selectedOrder.testingDetails?.labEta
                    ? new Date(selectedOrder.testingDetails.labEta).toLocaleString()
                    : "Not provided"}
                </span>
              </p>
            </div>

            {/* Uploaded Files */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">
                Uploaded Files</h3>

              {/* Test Order Files */}
              {selectedOrder.files?.length > 0 && (
                <div className="space-y-2 mb-3">
                  {selectedOrder.files.map((file, index) => (
                    <div
                      key={index}
                      // className="flex justify-between items-center border rounded-md px-3 py-2"
                      className="flex items-center justify-between px-4 py-2 border border-gray-200 rounded-lg bg-gray-50"
                    >
                      <span className="text-sm text-gray-700">
                        {file.fileType.replace("_", " ")}
                      </span>
                      <a
                        href={file.filePath}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        View
                      </a>
                    </div>
                  ))}
                </div>
              )}

              {/* Invoice File */}
              {selectedOrder.paymentInvoice?.invoiceUploadPath && (
                <div className="flex justify-between items-center border rounded-md px-3 py-2 bg-green-50">
                  <span className="text-sm font-medium text-green-800">
                    Invoice
                  </span>
                  <a
                    href={selectedOrder.paymentInvoice.invoiceUploadPath}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-green-700 hover:underline"
                  >
                    View Invoice
                  </a>
                </div>
              )}

              {/* No files case */}
              {!selectedOrder.files?.length &&
                !selectedOrder.paymentInvoice?.invoiceUploadPath && (
                  <p className="text-sm text-gray-500">No files uploaded</p>
                )}



            </div>
            {/* Logistics Section */}

            {selectedOrder.paymentInvoice?.billingStatus === "INVOICED" &&
              !selectedOrder.logisticsBounds && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                    Dispatch Details
                  </h4>

                  <div className="grid grid-cols-2 gap-4 mb-3">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">AWB Number</label>
                      <input
                        type="text"
                        value={awb}
                        onChange={(e) => setAwb(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Dispatch Date</label>
                      <input
                        type="date"
                        value={dispatchDate}
                        onChange={(e) => setDispatchDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  {logisticError && (
                    <p className="text-sm text-red-600 mb-2">{logisticError}</p>
                  )}

                  {logisticSuccess && (
                    <p className="text-sm text-green-600 mb-2">{logisticSuccess}</p>
                  )}

                  <button
                    onClick={saveLogistics}
                    disabled={logisticSaving}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {logisticSaving ? "Saving..." : "Save Dispatch Details"}
                  </button>
                </div>
              )}
            {selectedOrder.logisticsBounds && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700">
                  <strong>AWB:</strong> {selectedOrder.logisticsBounds.airwayBill}
                </p>
                <p className="text-sm text-blue-700">
                  <strong>Dispatch Date:</strong> {selectedOrder.logisticsBounds.dispatchDate}
                </p>
              </div>
            )}

            {selectedOrder.status === "DISPATCHED" &&
              selectedOrder.paymentInvoice?.billingStatus === "INVOICED" && (
                <div className="mt-6">
                  <button
                    onClick={verifyPayment}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700"
                  >
                    Verify Payment
                  </button>
                </div>
              )}


            {/* Approval Action */}
            <div className="flex justify-end pt-4">
              <button
                onClick={handleApprove}
                disabled={!canApprove}
                className={`px-6 py-2 rounded-lg font-medium transition
      ${canApprove
                    ? "bg-green-600 text-white hover:bg-green-700"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                  }
    `}
              >
                Approve Test Order
              </button>

            </div>


            {selectedOrder?.status === "PENDING_APPROVAL" && !canApprove && (
              <p className="text-xs text-gray-500 text-right">
                Lab ETA is required before approval
              </p>
            )}

            {canVerifyReport && (
              <div className="flex justify-end gap-4 pt-6">
                <button
                  onClick={() => handleVerifyReport(true)}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Completed – Pass
                </button>

                <button
                  onClick={() => handleVerifyReport(false)}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Completed – Fail
                </button>
              </div>
            )}

          </div>
        )}

      </div>

      {/* Create Order Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 flex items-center justify-between sticky top-0">
              <h3 className="text-xl font-bold text-white">Create New Test Order</h3>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError('');
                  setSuccess(false);
                }}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {/* Success Message */}
              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-800">Order created successfully!</p>
                    <p className="text-xs text-green-700 mt-1">Lab partners have been notified.</p>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                  <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              <div>
                {/* Created By */}
                <div className="mb-5">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Created By <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      name="createdBy"
                      required
                      className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Your name"
                      value={formData.createdBy}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Part Details Section */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Part Details
                  </h4>

                  {/* Manufacturer */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manufacturer <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="manufacturer"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="e.g., Acme Corp"
                      value={formData.manufacturer}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Part Number */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Part Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="partNumber"
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="e.g., PN-12345"
                      value={formData.partNumber}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                {/* Testing Details Section */}
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                    Testing Details
                  </h4>

                  {/* Tests to Perform */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tests to Perform <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      name="testsToPerform"
                      required
                      rows="3"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="Describe the tests that need to be performed"
                      value={formData.testsToPerform}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Client Deadline */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Deadline <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="datetime-local"
                        name="clientDeadline"
                        required
                        className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        value={formData.clientDeadline}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setError('');
                      setSuccess(false);
                    }}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Creating...
                      </span>
                    ) : (
                      'Create Order'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {showOrderModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-3xl rounded-xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-xl font-semibold">Test Order Details</h2>
              <button onClick={() => setShowOrderModal(false)}>✕</button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">

              {/* Order Info */}
              <section>
                <h3 className="font-semibold mb-2">Order Information</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <p><strong>Order ID:</strong> {selectedOrder.id}</p>
                  <p><strong>Status:</strong> {selectedOrder.status}</p>
                  <p><strong>Test Name:</strong> {selectedOrder.testName}</p>
                  <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
                </div>
              </section>

              {/* Lab ETA */}
              <section>
                <h3 className="font-semibold mb-2">Lab ETA</h3>
                {selectedOrder.labEta ? (
                  <p className="text-sm">
                    {new Date(selectedOrder.labEta).toLocaleString()}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">Not provided yet</p>
                )}
              </section>

              {/* Parts Received */}
              <section>
                <h3 className="font-semibold mb-2">Parts Received</h3>

                {selectedOrder.partsReceived ? (
                  <div className="text-sm space-y-2">
                    <p>
                      <strong>Date Received:</strong>{' '}
                      {selectedOrder.partsReceived.dateReceived}
                    </p>
                    <p>
                      <strong>Quantity:</strong>{' '}
                      {selectedOrder.partsReceived.qty}
                    </p>

                    {selectedOrder.partsReceived.fileUrl && (
                      <a
                        href={selectedOrder.partsReceived.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 underline"
                      >
                        View Uploaded File
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">
                    Parts not received yet
                  </p>
                )}
              </section>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setShowOrderModal(false)}
                className="px-4 py-2 bg-gray-200 rounded-lg text-sm"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;




