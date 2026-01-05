import React, { useState, useEffect } from 'react';
import { Package, LogOut, FileText, Calendar, CheckCircle, Clock, AlertCircle, DollarSign, RefreshCw, Bell, Eye, X } from 'lucide-react';
import { getAllTestOrders } from '../../services/testOrderService';
import { requestNotificationPermission, messaging , onMessage} from '../../config/firebase';
import { getLabNotifications ,getAllNotifications, markNotificationAsRead } from '../../services/notificationService';

const LabDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
const [activeStat, setActiveStat] = useState('ALL');

  // NEW: Notification state
  const [notification, setNotification] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  //NEW: upload document state
  const [dateReceived, setDateReceived] = useState('');
  const [quantityReceived, setQuantityReceived] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');

  //NEW: give lab eta
  const [labEta, setLabEta] = useState('');
  const [etaSaving, setEtaSaving] = useState(false);
  const [etaError, setEtaError] = useState('');
  const [etaSuccess, setEtaSuccess] = useState('');
  //NEW: status update
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [issueReason, setIssueReason] = useState("");
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const [actionChoice, setActionChoice] = useState(null);
  
  //NEW : upload invoice 
  // Invoice upload state
const [invoiceFile, setInvoiceFile] = useState(null);
const [invoiceUploading, setInvoiceUploading] = useState(false);
const [invoiceError, setInvoiceError] = useState("");
const [invoiceSuccess, setInvoiceSuccess] = useState("");
//upload invoice section
const uploadInvoice = async () => {
  if (!invoiceFile) {
    setInvoiceError("Please select an invoice file");
    return;
  }

  setInvoiceUploading(true);
  setInvoiceError("");
  setInvoiceSuccess("");

  try {
    const authToken = localStorage.getItem("authToken");
    const formData = new FormData();
    formData.append("file", invoiceFile);

    const response = await fetch(
      `${process.env.REACT_APP_API_URL || "http://localhost:8080/api"}/lab/upload-invoice/${selectedOrder.id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error("Failed to upload invoice");
    }

    setInvoiceSuccess("Invoice uploaded successfully");
    setInvoiceFile(null);

    await openOrderDetails(selectedOrder.id);
    fetchOrders();
  } catch (err) {
    setInvoiceError(err.message || "Something went wrong");
  } finally {
    setInvoiceUploading(false);
  }
};

//upload progress report and results
const submitReportFiles = async () => {
  if (!uploadedFile || uploadedFile.length === 0) {
    setUploadError("Please select at least one file");
    return;
  }

  setUploading(true);
  setUploadError("");
  setUploadSuccess("");

  try {
    const authToken = localStorage.getItem("authToken");
    const formData = new FormData();

    uploadedFile.forEach(file => formData.append("files", file));

    const response = await fetch(
      `${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}/lab/upload-report/${selectedOrder.id}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${authToken}`
        },
        body: formData
      }
    );

    if (!response.ok) {
      throw new Error("Failed to upload report files");
    }

    setUploadSuccess("Report files uploaded successfully");
    setUploadedFile(null);

    // Refresh order data
    await openOrderDetails(selectedOrder.id);
    fetchOrders();
  } catch (err) {
    console.error(err);
    setUploadError(err.message || "Something went wrong");
  } finally {
    setUploading(false);
  }
};

  //get a test Order by id
  const openOrderDetails = async (id) => {
    const authToken = localStorage.getItem("authToken");
    if (!id) return;

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/user/get-testorder/${id}`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch order details");

      const data = await res.json();
      setSelectedOrder(data); // assumes you have this state
    } catch (err) {
      console.error(err);
    }
  };
  //checking whether lab user submitetd lab eta and  files
  // Inside LabDashboard component
  // Inside LabDashboard component
const hasSubmittedInitialETAAndFiles = Boolean(selectedOrder?.testingDetails?.labEta)
                                     && selectedOrder?.files?.some(f => f.fileType === "RECIEVED");

// Lab actions after admin approves (IN_PROGRESS)
const canTakeLabAction = selectedOrder?.status === "IN_PROGRESS";

const labEtaSubmitted = Boolean(selectedOrder?.testingDetails?.labEta);
const fileAlreadyUploaded = selectedOrder?.files?.length > 0;

const labAlreadySubmitted = labEtaSubmitted && fileAlreadyUploaded;
// check if reports already uploaded
const reportAlreadyUploaded = selectedOrder?.files?.some(
  (file) => file.fileType === "REPORTS"
);

// check if order is on hold
const isOnHold = selectedOrder?.status === "ON_HOLD";

// final lock
const labActionLocked = reportAlreadyUploaded || isOnHold;

console.log("REPORT UPLOADED:", reportAlreadyUploaded);
console.log("ON HOLD:", isOnHold);
console.log("LAB ACTION LOCKED:", labActionLocked);

useEffect(() => {
  if (selectedOrder) {
    console.log("Selected Order:", selectedOrder);
    console.log("ETA:", selectedOrder.testingDetails?.labEta);
    console.log("FILES:", selectedOrder.files);
    
    const labEtaSubmitted = Boolean(selectedOrder.testingDetails?.labEta);
    const fileAlreadyUploaded = selectedOrder.files?.length > 0;
    console.log("LOCKED:", labEtaSubmitted && fileAlreadyUploaded);
  }
}, [selectedOrder]);


  //handle issue
  const handleIssueFound = async () => {
    if (!issueReason.trim()) {
      alert("Reason is required");
      return;
    }

    if (!selectedOrder?.id) return;

    setIssueSubmitting(true);

    const authToken = localStorage.getItem("authToken");

    try {
      const res = await fetch(
        `${process.env.REACT_APP_API_URL}/lab/issue-found/${selectedOrder.id}?reason=${encodeURIComponent(issueReason)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );

      if (!res.ok) throw new Error("Failed to submit issue");

      // Refresh order details
      await openOrderDetails(selectedOrder.id);
      fetchOrders();

      setShowIssueModal(false);
      setIssueReason("");
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setIssueSubmitting(false);
    }
  };

  //upload lab eta
  const saveLabEta = async () => {
    if (!labEta) {
      setEtaError('Please select ETA date & time');
      return;
    }

    setEtaSaving(true);
    setEtaError('');
    setEtaSuccess('');

    try {
      const authToken = localStorage.getItem('authToken');

      const formData = new FormData();
      formData.append('labEta', labEta); // LocalDateTime

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}/lab/labEta/${selectedOrder.id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save ETA');
      }

      setEtaSuccess('Lab ETA saved successfully');
      fetchOrders(); // refresh data
    } catch (err) {
      setEtaError(err.message || 'Something went wrong');
    } finally {
      setEtaSaving(false);
    }
  };

  //upload document to backend
  const uploadPartReceived = async () => {
    if (!dateReceived || !quantityReceived || !uploadedFile) {
      setUploadError('All fields are required');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const authToken = localStorage.getItem('authToken');

      const formData = new FormData();
      formData.append('dateRecieved', dateReceived);
      formData.append('qty', quantityReceived);
      formData.append('uploadedFile', uploadedFile);

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}/lab/part-recieved/${selectedOrder.id}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      setUploadSuccess('Parts received successfully');
      fetchOrders(); // refresh order list
    } catch (err) {
      setUploadError(err.message || 'Something went wrong');
    } finally {
      setUploading(false);
    }
  };

  // Fetch all test orders
  const fetchNotifications = async () => {
    setLoadingNotifications(true);
    try {
      const data = await getLabNotifications();
      // Transform backend data to match frontend format
      const transformedNotifications = data.map(notif => ({
        id: notif.id,
        title: notif.title,
        body: notif.body,
        orderId: notif.orderId,
        timestamp: notif.createdAt ? new Date(notif.createdAt) : new Date(),
        read: notif.read,
        type: notif.type,
        recipient: notif.recipient
      }));
      setNotificationHistory(transformedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  };
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

  // NEW: Register device token with backend
  const registerDeviceToken = async (token) => {
    try {
      const authToken = localStorage.getItem('authToken');
      console.log('JWT:', authToken);

      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8080/api'}/user/device/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ token })
      });

      console.log('Device token registered successfully');

    } catch (error) {
      console.error('Error registering device token:', error);
    }
  };
  useEffect(() => {
    if (!showDetailModal) {
      setActionChoice(null);
      setIssueReason("");
      setUploadedFile(null);
    }
  }, [showDetailModal]);


 useEffect(() => {
  fetchOrders();
  fetchNotifications();

  let unsubscribe;

const initFCM = async () => {
  try {
    const fcmToken = await requestNotificationPermission();

    if (fcmToken) {
      console.log('🔑 Current FCM Token:', fcmToken);
      
      // 🔥 ALWAYS register token (remove the saved token check)
      await registerDeviceToken(fcmToken);
      localStorage.setItem('fcmToken', fcmToken);
      
      console.log('✅ Token registered with backend');
    }

    // 🔥 LISTEN FOR FOREGROUND MESSAGES
    unsubscribe = onMessage(messaging, (payload) => {
      console.log("🔥 FCM PAYLOAD RECEIVED:", payload);
        const title = payload.notification?.title || payload.data?.title || "New Test Order";
        const body = payload.notification?.body || payload.data?.body || "A new test order has been assigned";
        const orderId = payload.data?.orderId || null;

        const newNotification = {
          id: Date.now(),
          title,
          body,
          orderId,
          read: false,
          timestamp: new Date(),
        };

        // Show toast notification
        setNotification(newNotification);
        setShowNotification(true);

        // Add to notification panel list
        setNotificationHistory(prev => [newNotification, ...prev]);

        // Refresh orders
        fetchOrders();

        // Auto-hide after 15 seconds
        setTimeout(() => {
          setShowNotification(false);
        }, 15000);
      });

    } catch (err) {
      console.error('FCM setup failed:', err);
    }
  };

  initFCM();

  return () => {
    if (unsubscribe) unsubscribe();
  };
}, []);



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
    const color = billingStatus === 'INVOICED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${color}`}>
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

  const getDeadlineStatus = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const hoursLeft = (deadlineDate - now) / (1000 * 60 * 60);

    if (hoursLeft < 0) {
      return { text: 'Overdue', color: 'text-red-600' };
    } else if (hoursLeft < 24) {
      return { text: `${Math.floor(hoursLeft)}h left`, color: 'text-red-600' };
    } else if (hoursLeft < 48) {
      return { text: `${Math.floor(hoursLeft)}h left`, color: 'text-yellow-600' };
    } else {
      return { text: `${Math.floor(hoursLeft / 24)}d left`, color: 'text-green-600' };
    }
  };

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };
  const markNotificationReadLocal = (id) => {
    setNotificationHistory(prev =>
      prev.map(notif =>
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };
  const handleMarkAsRead = async (id) => {
    try {
      await markNotificationAsRead(id); // backend
      markNotificationReadLocal(id);    // UI
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };
  const removeNotificationFromUI = (id) => {
    setNotificationHistory(prev =>
      prev.filter(notif => notif.id !== id)
    );
  };

  console.table(notificationHistory.map(n => ({
    notifId: n.id,
    orderId: n.orderId,
    title: n.title
  })));

  const handleNotificationClick = async (notif) => {
    // mark as read (backend)
    console.log("CLICKED NOTIF orderId:", notif.orderId);
    console.log("ORDERS IDS:", orders.map(o => o.id));
    await handleMarkAsRead(notif.id);

    // find order from already fetched orders
    const order = orders.find(
      o => o.id === notif.orderId
    );


    console.log("FOUND ORDER:", order);

    if (order) {
      setSelectedOrder(order);
      setShowDetailModal(true);
      setShowNotificationPanel(false);
    } else {
      console.warn('Order not found:', notif.orderId);
    }
  };


  const markAllAsRead = async () => {
    try {
      const unreadNotifications = notificationHistory.filter(n => !n.read);

      await Promise.all(
        unreadNotifications.map(notif => markNotificationAsRead(notif.id))
      );

      setNotificationHistory(prev =>
        prev.map(notif => ({ ...notif, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };


  const clearAllNotifications = () => {
    setNotificationHistory([]);
  };

  const formatNotificationTime = (timestamp) => {
    const now = new Date();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };


  // Calculate stats from orders
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'AWAITING_PARTS' || o.status === 'IN_PROGRESS' || o.status === 'ON_HOLD').length,
    completed: orders.filter(o => o.status === 'COMPLETED_PASS' || o.status === 'COMPLETED_FAIL' || o.status === 'CLOSED').length,
    urgent: orders.filter(o => {
      const hoursLeft = (new Date(o.testingDetails?.clientDeadline) - new Date()) / (1000 * 60 * 60);
      return hoursLeft < 24 && hoursLeft > 0 && o.status !== 'COMPLETED_PASS' && o.status !== 'COMPLETED_FAIL' && o.status !== 'CLOSED';
    }).length
  };
  const unreadCount = notificationHistory.filter(n => !n.read).length;
const filteredOrders = orders.filter(order => {
  if (activeStat === 'PENDING') {
    return ['AWAITING_PARTS', 'IN_PROGRESS', 'ON_HOLD'].includes(order.status);
  }

  if (activeStat === 'COMPLETED') {
    return ['COMPLETED_PASS', 'COMPLETED_FAIL', 'CLOSED'].includes(order.status);
  }

  if (activeStat === 'URGENT') {
    const hoursLeft =
      (new Date(order.testingDetails?.clientDeadline) - new Date()) /
      (1000 * 60 * 60);

    return hoursLeft < 24 && hoursLeft > 0 &&
      !['COMPLETED_PASS', 'COMPLETED_FAIL', 'CLOSED'].includes(order.status);
  }

  return true; // ALL
});

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-100">
      {/* NEW: Notification Banner */}
      {/* NEW: Notification Banner */}
      {showNotification && notification && (
        <div className="fixed top-4 right-4 z-50 max-w-sm animate-slide-in">
          <div className="bg-white rounded-lg shadow-2xl border-l-4 border-purple-600 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">{notification.title}</h4>
                <p className="text-sm text-gray-600">{notification.body}</p>
              </div>


            </div>
          </div>
        </div>
      )}

      {/* Header */}
<div className="bg-white border-b">
  <div className="max-w-7xl mx-auto px-6">
    <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Lab Testing Portal</h1>
                <p className="text-xs text-gray-500">Lab Partner Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className="relative p-2 text-gray-700 hover:text-gray-900 transition-colors">
                <Bell className="w-6 h-6" />
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome, Lab Partner</h2>
          <p className="text-gray-600">View and manage assigned test orders</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div 
  onClick={() => setActiveStat('ALL')}
  className={`bg-white rounded-xl shadow-md p-6 cursor-pointer transition
    ${activeStat === 'ALL' ? 'ring-2 ring-purple-400' : 'hover:shadow-lg'}
  `}
>

                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              
              <div  onClick={() => setActiveStat('PENDING')}
  className={`bg-white rounded-xl shadow-md p-6 cursor-pointer transition
    ${activeStat === 'PENDING' ? 'ring-2 ring-yellow-400' : 'hover:shadow-lg'}
  `}>
                <p className="text-sm text-gray-600 mb-1">Pending</p>
                <p className="text-3xl font-bold text-gray-900">{stats.pending}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div
  onClick={() => setActiveStat('COMPLETED')}
  className={`bg-white rounded-xl shadow-md p-6 cursor-pointer transition
    ${activeStat === 'COMPLETED' ? 'ring-2 ring-green-400' : 'hover:shadow-lg'}
  `}
>

                <p className="text-sm text-gray-600 mb-1">Completed</p>
                <p className="text-3xl font-bold text-gray-900">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div 
  onClick={() => setActiveStat('URGENT')}
  className={`bg-white rounded-xl shadow-md p-6 cursor-pointer transition
    ${activeStat === 'URGENT' ? 'ring-2 ring-red-400' : 'hover:shadow-lg'}
  `}
>

                <p className="text-sm text-gray-600 mb-1">Urgent</p>
                <p className="text-3xl font-bold text-red-600">{stats.urgent}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Orders Section */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Test Orders</h3>
              <p className="text-sm text-gray-600">View all assigned test orders</p>
            </div>
            <button
              onClick={fetchOrders}
              disabled={loadingOrders}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${loadingOrders ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Loading State */}
          {loadingOrders && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
              <p className="mt-4 text-gray-600">Loading orders...</p>
            </div>
          )}

          {/* Error State */}
          {!loadingOrders && ordersError && (
            <div className="border border-red-200 rounded-lg p-8 text-center bg-red-50">
              <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
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

          {/* Empty State */}
          {!loadingOrders && !ordersError && orders.length === 0 && (
            <div className="border border-gray-200 rounded-lg p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 mb-2">No test orders available</p>
              <p className="text-sm text-gray-500">You'll see orders here when they are assigned to you</p>
            </div>
          )}

          {/* Orders Table */}
          {!loadingOrders && !ordersError && orders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Part Details</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tests</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Billing</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created By</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((order, index) => {
                    const deadlineStatus = order.testingDetails?.clientDeadline
                      ? getDeadlineStatus(order.testingDetails.clientDeadline)
                      : null;

                    return (
                      <tr key={order._id || index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
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
                          {deadlineStatus && (
                            <div className={`text-xs font-medium ${deadlineStatus.color}`}>
                              {deadlineStatus.text}
                            </div>
                          )}
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
                        <td className="px-4 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleViewDetails(order)}
                            className="flex items-center gap-1 text-purple-600 hover:text-purple-800 text-sm font-medium transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* Notification Panel */}
      {showNotificationPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            {/* Panel Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-white" />
                <h3 className="text-lg font-bold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-white text-purple-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowNotificationPanel(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Actions Bar */}
            {notificationHistory.length > 0 && (
              <div className="px-6 py-3 border-b border-gray-200 flex gap-2">
                <button
                  onClick={markAllAsRead}
                  className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                >
                  Mark all as read
                </button>
                <span className="text-gray-300">|</span>
                <button
                  onClick={clearAllNotifications}
                  className="text-sm text-red-600 hover:text-red-800 font-medium"
                >
                  Clear all
                </button>
              </div>
            )}


            {/* Notifications List */}
            <div className="flex-1 overflow-y-auto">
              {notificationHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                  <Bell className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-gray-600 font-medium mb-1">No notifications yet</p>
                  <p className="text-sm text-gray-500">You'll see notifications here when test orders are created</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {notificationHistory.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 hover:bg-gray-50 transition-colors ${!notif.read ? 'bg-purple-50' : ''
                        }`}
                    >
                      <div className="flex gap-3 items-start">

                        {/* unread dot */}
                        <div
                          className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.read ? 'bg-purple-600' : 'bg-gray-300'
                            }`}
                        />

                        {/* notification content */}
                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => handleNotificationClick(notif)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h4
                              className={`text-sm font-semibold ${!notif.read ? 'text-gray-900' : 'text-gray-600'
                                }`}
                            >
                              {notif.title}
                            </h4>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatNotificationTime(notif.timestamp)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-600 break-words">
                            {notif.body}
                          </p>
                        </div>

                        {/* ❌ remove from UI ONLY */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // 🔥 VERY IMPORTANT
                            removeNotificationFromUI(notif.id);
                          }}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Remove"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {showDetailModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-5 flex items-center justify-between sticky top-0">
              <h3 className="text-xl font-bold text-white">Order Details</h3>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <AlertCircle className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Status and Billing */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Status</h4>
                  {getStatusBadge(selectedOrder.status || 'AWAITING_PARTS')}
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Billing Status</h4>
                  {getBillingBadge(selectedOrder.paymentInvoice?.billingStatus || 'UNINVOICED')}
                </div>
                              {["COMPLETED_PASS", "COMPLETED_FAIL"].includes(selectedOrder.status) && (
                  <div className="mb-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                      Upload Invoice
                    </h4>

                    <div className="mb-3">
                      <input
                        type="file"
                        onChange={(e) => setInvoiceFile(e.target.files[0])}
                        className="w-full text-sm"
                      />
                    </div>

                    {invoiceError && (
                      <p className="text-sm text-red-600 mb-2">{invoiceError}</p>
                    )}

                    {invoiceSuccess && (
                      <p className="text-sm text-green-600 mb-2">{invoiceSuccess}</p>
                    )}

                    <button
                      onClick={uploadInvoice}
                      disabled={invoiceUploading}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {invoiceUploading ? "Uploading..." : "Submit Invoice"}
                    </button>
                  </div>
                )}

              </div>
              
              {selectedOrder?.status === "IN_PROGRESS" && !labActionLocked && (
  <div className="grid grid-cols-2 gap-4 mt-4">

    {/* Upload Report */}
    <button
      onClick={() => setActionChoice("UPLOAD")}
      className="p-4 border rounded-lg hover:bg-gray-50"
    >
      Upload Report
    </button>

    {/* On Hold */}
    <button
      onClick={() =>{
    setActionChoice("HOLD");
    setShowIssueModal(true);
  }}
      className="p-4 border rounded-lg hover:bg-gray-50"
    >
      Put On Hold
    </button>

  </div>
)}

         {actionChoice === "UPLOAD" && !labActionLocked && (
  <div className="mb-6">
    <h4 className="text-lg font-semibold mb-2">Upload Report</h4>

    <input
      type="file"
      multiple
      onChange={(e) => setUploadedFile(Array.from(e.target.files))}
    />

    <button onClick={submitReportFiles}>
      Submit Report
    </button>
  </div>
)}
{selectedOrder?.status === "IN_PROGRESS" && labActionLocked && (
  <div className="mt-4 p-3 bg-gray-100 rounded text-sm text-gray-600">
    Report already uploaded. No further actions are allowed for this test order.
  </div>
)}


{showIssueModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">
        Issue Found / On Hold
      </h3>

      <textarea
        value={issueReason}
        onChange={(e) => setIssueReason(e.target.value)}
        placeholder="Enter reason for putting this order on hold..."
        className="w-full border border-gray-300 rounded-lg p-3 text-sm mb-4"
        rows={4}
      />

      <div className="flex gap-3 justify-end">
        <button
          onClick={() => setShowIssueModal(false)}
          className="px-4 py-2 border rounded-lg"
        >
          Cancel
        </button>

        <button
          onClick={handleIssueFound}
          disabled={issueSubmitting}
          className="px-4 py-2 bg-yellow-500 text-white rounded-lg"
        >
          {issueSubmitting ? "Submitting..." : "Submit Issue"}
        </button>
      </div>
    </div>
  </div>
)}

              {/* Part Details */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  Part Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Manufacturer</p>
                    <p className="text-base font-medium text-gray-900">{selectedOrder.partDetails?.manufacturer || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Part Number</p>
                    <p className="text-base font-medium text-gray-900">{selectedOrder.partDetails?.partNumber || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Testing Details */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  Testing Details
                </h4>
                <div className="mb-4">
                  <p className="text-sm text-gray-500 mb-1">Tests to Perform</p>
                  <p className="text-base text-gray-900">{selectedOrder.testingDetails?.testsToPerform || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Client Deadline</p>
                  <p className="text-base font-medium text-gray-900">
                    {selectedOrder.testingDetails?.clientDeadline ? formatDate(selectedOrder.testingDetails.clientDeadline) : 'N/A'}
                  </p>
                  {selectedOrder.testingDetails?.clientDeadline && (
                    <p className={`text-sm font-medium ${getDeadlineStatus(selectedOrder.testingDetails.clientDeadline).color}`}>
                      {getDeadlineStatus(selectedOrder.testingDetails.clientDeadline).text}
                    </p>
                  )}
                </div>
              </div>

              {/* Created By */}
              <div className="mb-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  Order Information
                </h4>
                <div>
                  <p className="text-sm text-gray-500">Created By</p>
                  <p className="text-base font-medium text-gray-900">{selectedOrder.createdBy?.name || 'Unknown'}</p>
                </div>
              </div>
              {/* Parts Received Upload Section */}
              {selectedOrder.status === "AWAITING_PARTS" && !hasSubmittedInitialETAAndFiles && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200">
                    Parts Received
                  </h4>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">
                        Date Received
                      </label>
                      <input
                        type="date"
                        value={dateReceived}
                        onChange={(e) => setDateReceived(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-sm text-gray-500 mb-1">
                        Quantity Received
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={quantityReceived}
                        onChange={(e) => setQuantityReceived(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm text-gray-500 mb-1">
                      Upload Document
                    </label>
                    <input
                      type="file"
                      onChange={(e) => setUploadedFile(e.target.files[0])}
                      className="w-full text-sm"
                    />
                  </div>

                  {uploadError && (
                    <p className="text-sm text-red-600 mb-2">{uploadError}</p>
                  )}

                  {uploadSuccess && (
                    <p className="text-sm text-green-600 mb-2">{uploadSuccess}</p>
                  )}

                  <button
                    onClick={uploadPartReceived}
                    disabled={uploading}
                    className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : 'Submit Parts Received'}
                  </button>
                </div>
              )}
              {/* Lab ETA Section */} 
              {selectedOrder.status === "AWAITING_PARTS" && !hasSubmittedInitialETAAndFiles && (

              <div className="mb-6"> 
                <h4 className="text-lg font-semibold text-gray-900 mb-3 pb-2 border-b border-gray-200"> Lab ETA </h4>
                 <div className="mb-3"> 
                  <label className="block text-sm text-gray-500 mb-1"> Estimated Completion Date & Time </label> 
                  <input type="datetime-local" value={labEta} onChange={(e) => setLabEta(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" /> 
                  </div> 
                  {etaError && (<p className="text-sm text-red-600 mb-2">{etaError}</p>)} 
                  {etaSuccess && (<p className="text-sm text-green-600 mb-2">{etaSuccess}</p>)}
                   <button onClick={saveLabEta} disabled={etaSaving} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50" > 
                    {etaSaving ? 'Saving...' : 'Submit Lab ETA'} </button> 
                    </div>

              )}
              {labAlreadySubmitted && (
  <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
    <p className="text-sm text-green-700 font-medium">
      ✔ Lab ETA and required documents have already been submitted.
    </p>
  </div>
)}


              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all"
                >
                  Close
                </button>
                <button
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-medium hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
                >
                  Update Status
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabDashboard;