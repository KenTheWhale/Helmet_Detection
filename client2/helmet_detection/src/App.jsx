import './App.css'
import {useEffect, useState} from "react";
import axios from "axios";

function App() {
    // 1. Quản lý cấu hình URL Backend
    const [baseUrl, setBaseUrl] = useState("");
    const [tempUrl, setTempUrl] = useState("");
    const [isConfigured, setIsConfigured] = useState(false);

    // 2. Các State quản lý luồng dữ liệu
    const [source, setSource] = useState(null);
    const [ytLink, setYtLink] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [latency, setLatency] = useState(14);
    const [logs, setLogs] = useState([]);
    const [isServerOnline, setIsServerOnline] = useState(false);

    // Hàm xác nhận URL từ Popup
    const handleConnect = () => {
        if (!tempUrl) return alert("Vui lòng nhập URL Backend");
        setBaseUrl(tempUrl);
        setIsConfigured(true);
    };

    // 3. Effect lấy logs (Chỉ chạy khi đã có baseUrl)
    useEffect(() => {
        if (!isConfigured) return;

        const fetchLogs = async () => {
            try {
                const response = await axios.get(`${baseUrl}/logs`);
                // KIỂM TRA DỮ LIỆU TRƯỚC KHI SET STATE
                if (Array.isArray(response.data)) {
                    setLogs(response.data);
                } else if (response.data && Array.isArray(response.data.logs)) {
                    setLogs(response.data.logs); // Trường hợp backend trả về { logs: [...] }
                }
            } catch (error) {
                console.error("Không thể lấy dữ liệu log:", error);
            }
        };
        fetchLogs();
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, [isConfigured, baseUrl]);

    // Effect giả lập latency
    useEffect(() => {
        const interval = setInterval(() => {
            const randomLatency = Math.floor(Math.random() * 20) + 1;
            setLatency(randomLatency);
        }, 1500);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!isConfigured) return;

        const checkStatus = async () => {
            try {
                // Thử gọi đến endpoint logs hoặc tạo 1 endpoint /health bên backend
                const response = await axios.get(`${baseUrl}/logs`);
                if (response.status === 200) {
                    setIsServerOnline(true);
                }
            } catch (error) {
                setIsServerOnline(false);
                console.error("Server mất kết nối.");
            }
        };

        checkStatus(); // Chạy ngay lập tức
        const interval = setInterval(checkStatus, 5000); // Kiểm tra lại mỗi 5 giây
        return () => clearInterval(interval);
    }, [isConfigured, baseUrl]);

    // 4. Các hàm xử lý sự kiện
    const handleWebcam = () => {
        setIsLoading(true);
        setSource(`${baseUrl}/video_feed?t=${Date.now()}`);
        setIsStreaming(true);
        setTimeout(() => setIsLoading(false), 1000);
    };

    const handleYoutube = () => {
        if (!ytLink) return alert("Vui lòng nhập link YouTube");
        setIsLoading(true);
        setSource(`${baseUrl}/stream_youtube?link=${encodeURIComponent(ytLink)}&t=${Date.now()}`);
        setIsStreaming(true);
        setTimeout(() => setIsLoading(false), 2000);
    };

    const stopStream = async () => {
        try {
            await axios.post(`${baseUrl}/stop_camera`);
            setSource(null);
            setIsStreaming(false);
            setIsLoading(false);
        } catch (error) {
            console.error("Lỗi khi dừng hệ thống:", error);
        }
    };

    const deleteLog = async (id) => {
        try {
            await axios.delete(`${baseUrl}/logs/${id}`);
            setLogs(logs.filter(log => log.id !== id));
        } catch (error) {
            console.error("Không thể xóa log:", error);
            alert("Có lỗi xảy ra khi xóa log!");
        }
    };

    return (<div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans p-4 md:p-8 antialiased">
        {/* --- POPUP CẤU HÌNH BAN ĐẦU --- */}
        {!isConfigured && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl">
                <div className="bg-slate-900 border border-slate-700 p-8 rounded-[2.5rem] shadow-2xl max-w-md w-full mx-4 text-center">
                    <div className="w-20 h-20 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">Cấu hình Server</h2>
                    <p className="text-slate-400 text-sm mb-6">Vui lòng nhập địa chỉ URL của Backend AI để bắt đầu giám sát.</p>

                    <div className="space-y-4">
                        <input
                            type="text"
                            className="w-full bg-slate-800 border border-slate-600 p-4 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all text-blue-400 font-mono"
                            placeholder="https://your-api-url.com"
                            value={tempUrl}
                            onChange={(e) => setTempUrl(e.target.value)}
                        />
                        <button
                            onClick={handleConnect}
                            className="w-full bg-blue-600 hover:bg-blue-500 py-4 rounded-2xl font-black text-sm transition-all shadow-lg shadow-blue-900/40 active:scale-95"
                        >
                            KẾT NỐI HỆ THỐNG
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Header Section */}
        <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-center md:text-left">
                <h1 className="text-4xl font-black tracking-tighter text-white">
                    SAFETY <span className="text-blue-500 italic">MONITOR</span> AI
                </h1>
                <p className="text-slate-400 text-sm mt-1">Giám sát bảo hộ lao động tự động qua YOLOv11</p>
            </div>
            <div className="flex gap-6 bg-slate-800/40 px-6 py-3 rounded-2xl border border-slate-700/50">
                <div className="text-center">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Server Status</p>
                    <div className="flex items-center gap-2 justify-center">
                        <div className={`w-2 h-2 rounded-full ${isServerOnline ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <p className={`font-mono text-sm uppercase font-bold ${isServerOnline ? 'text-emerald-400' : 'text-red-500'}`}>
                            {isServerOnline ? 'Online' : 'Offline'}
                        </p>
                    </div>
                </div>
                <div className="w-px bg-slate-700"></div>
                <div className="text-center overflow-hidden max-w-[150px]">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">API Endpoint</p>
                    <p className="text-blue-400 font-mono text-[10px] truncate">{baseUrl}</p>
                </div>
            </div>
        </div>

        {/* Main Content: Grid 2/3 - 1/3 */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* --- CỘT TRÁI: MÀN HÌNH GIÁM SÁT (8/12) --- */}
            <div className="lg:col-span-8 space-y-6">
                <div className="relative w-full h-[500px] lg:h-[680px] bg-black rounded-[2.5rem] border-4 border-slate-800 shadow-2xl overflow-hidden flex items-center justify-center group">
                    {isStreaming && source ? (
                        <>
                            <img src={source} alt="AI Stream" className="w-full h-full object-cover bg-slate-900" />
                            <div className="absolute top-8 left-8 flex items-center gap-2 bg-red-600/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[11px] font-black animate-pulse">
                                <div className="w-2 h-2 bg-white rounded-full"></div>LIVE
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center opacity-30 text-slate-500">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                            <p className="text-lg font-bold tracking-[0.3em] uppercase">System Standby</p>
                        </div>
                    )}
                    {isLoading && (
                        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-blue-400 font-bold tracking-tighter">ĐANG KHỞI TẠO AI...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- CỘT PHẢI: ĐIỀU KHIỂN & NHẬT KÝ (4/12) --- */}
            <div className="lg:col-span-4 flex flex-col gap-6">

                {/* 1. Bảng điều khiển */}
                <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700 shadow-xl backdrop-blur-md">
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Bảng điều khiển</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block ml-1">Link YouTube</label>
                            <div className="flex gap-2">
                                <input
                                    className="flex-1 bg-slate-900 border border-slate-700 p-3.5 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                                    placeholder="Dán link tại đây..."
                                    value={ytLink}
                                    onChange={(e) => setYtLink(e.target.value)}
                                    disabled={isStreaming}
                                />
                                <button onClick={handleYoutube} disabled={isStreaming} className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white px-5 rounded-xl font-bold text-xs transition-all active:scale-95">CHẠY</button>
                            </div>
                        </div>
                        {!isStreaming ? (
                            <button onClick={handleWebcam} className="w-full bg-emerald-600 hover:bg-emerald-500 py-4 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-3">
                                <span className="text-xl">●</span> MỞ CAMERA GIÁM SÁT
                            </button>
                        ) : (
                            <button onClick={stopStream} className="w-full bg-rose-600 hover:bg-rose-500 py-4 rounded-xl font-black text-sm transition-all">DỪNG HỆ THỐNG</button>
                        )}
                    </div>
                </div>

                {/* 2. Stats (Latency & YOLO) */}
                <div className="bg-slate-800/30 p-5 rounded-3xl border border-slate-700/50 grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/30 text-center">
                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Latency</p>
                        <p className="font-mono text-blue-400 font-bold text-lg">{latency}ms</p>
                    </div>
                    <div className="bg-slate-900/60 p-4 rounded-2xl border border-slate-700/30 text-center">
                        <p className="text-[9px] text-slate-500 uppercase font-black mb-1">YOLO Engine</p>
                        <p className="font-mono text-blue-400 font-bold text-lg">v11 Pro</p>
                    </div>
                </div>

                {/* 3. Nhật ký vi phạm (Log Table) */}
                <div
                    className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700 flex flex-col h-[270px] overflow-hidden">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span> Nhật ký vi phạm
                        </h3>
                        <a
                            href="https://console.cloudinary.com/app/c-6f1bb8a19508cdc4940799e65946ee/assets/media_library/folders/cdc639b7f4093d133dc56c54344bb74978?view_mode=mosaic"
                            target="_blank"
                            rel="noreferrer"
                            className="text-[9px] font-black bg-blue-600/20 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition duration-300 shadow-sm shadow-blue-900/20"
                        >
                            QUẢN LÝ ẢNH (CẦN QUYỀN) ↗
                        </a>
                    </div>

                    {/* Log List Scrollable */}
                    <div
                        className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                        {logs.length > 0 ? (logs.map((log) => (<div
                            key={log.id}
                            className="bg-slate-950/50 p-4 rounded-2xl border border-slate-700/50 hover:border-red-500/30 transition-all duration-300 group">
                            <div className="flex justify-between items-start mb-2">
                                <span
                                    className="text-[10px] font-mono text-blue-400 bg-blue-500/5 px-2 py-0.5 rounded border border-blue-500/20 truncate w-[55%]">
                                    {log.name}
                                </span>
                                <div className="flex items-center gap-2">
                                    <span
                                        className="text-[9px] text-slate-500 font-bold italic mr-1">
                                        {log.time}
                                    </span>

                                    {/* NÚT XEM ẢNH */}
                                    <a
                                        href={log.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 p-1.5 rounded-lg transition-all shadow-sm"
                                        title="Xem ảnh"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg"
                                             className="h-3.5 w-3.5"
                                             fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  strokeWidth={2.5}
                                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  strokeWidth={2.5}
                                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                                        </svg>
                                    </a>

                                    {/* NÚT XÓA LOG */}
                                    <button
                                        onClick={() => deleteLog(log.id)}
                                        className="text-rose-400 hover:text-white bg-rose-500/10 hover:bg-rose-600 p-1.5 rounded-lg transition-all shadow-sm"
                                        title="Xóa bản ghi"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg"
                                             className="h-3.5 w-3.5"
                                             fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
                                <span className="text-xs text-slate-200 font-medium">Vi phạm: Không mũ bảo hộ</span>
                            </div>
                        </div>))) : (<div
                            className="h-full flex flex-col items-center justify-center opacity-30 text-slate-500 italic">
                            <p className="text-xs">Chưa ghi nhận vi phạm...</p>
                        </div>)}
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <footer
            className="max-w-7xl mx-auto mt-12 text-center text-[10px] text-slate-600 font-bold uppercase tracking-[0.4em]">
            &copy; 2026 AI Surveillance System - Security Integrated
        </footer>
    </div>);
}

export default App
