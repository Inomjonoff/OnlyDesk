import tkinter as tk
from tkinter import ttk, messagebox
import threading
import asyncio
import logging
import base64
import os
import nacl.utils

from client.network.signaling import SignalingClient
from client.network.connection import ConnectionManager
from client.capture.capturer import ScreenCapturer
from client.codec.encoder import VideoEncoder
from client.codec.decoder import VideoDecoder
from client.display.viewer import RemoteViewer
from client.input.capture import translate_pygame_event, GlobalPanicListener
from client.input.injection import InputInjector
from client.features.clipboard import ClipboardManager
from client.features.file_transfer import FileTransferSender, FileTransferReceiver
from client.features.audio import AudioStreamer, AudioPlayer
import client.config as config

logger = logging.getLogger("onlydesk.gui")

class OnlyDeskGUI:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("OnlyDesk - Remote Desktop")
        self.root.geometry("600x420")
        self.root.configure(bg="#1a1a24")
        self.root.resizable(False, False)

        # Style configurations
        self.style = ttk.Style()
        self.style.theme_use('clam')
        
        # Threads and Event Loops
        self.loop = asyncio.new_event_loop()
        self.async_thread = threading.Thread(target=self._run_async_loop, daemon=True)
        
        # State variables
        self.my_id = "Ulanmoqda..."
        self.client_id = None
        self.signaling = None
        self.active_manager = None
        self.is_connected = False
        
        self.setup_ui()
        self.async_thread.start()
        
        # Poll signaling client registration status
        self.root.after(500, self._check_registration)

    def _run_async_loop(self):
        asyncio.set_event_loop(self.loop)
        # Initialize signaling client
        self.client_id = f"client-{os.urandom(4).hex()}"
        self.signaling = SignalingClient(
            server_host=config.DEFAULT_SIGNAL_SERVER, 
            server_port=config.DEFAULT_SIGNAL_PORT,
            on_peer_invite=self._on_incoming_invite,
            on_peer_info=self._on_incoming_info,
            on_error=self._on_signaling_error
        )
        self.loop.run_until_complete(self.signaling.connect())
        self.loop.run_forever()

    def setup_ui(self):
        # Header / Title
        header_frame = tk.Frame(self.root, bg="#1a1a24")
        header_frame.pack(fill=tk.X, pady=15)
        
        lbl_title = tk.Label(
            header_frame, 
            text="ONLYDESK", 
            font=("Segoe UI", 20, "bold"), 
            fg="#00adb5", 
            bg="#1a1a24"
        )
        lbl_title.pack()
        
        lbl_subtitle = tk.Label(
            header_frame, 
            text="Open-source secure remote controller", 
            font=("Segoe UI", 9, "italic"), 
            fg="#8c8c9e", 
            bg="#1a1a24"
        )
        lbl_subtitle.pack()

        # Main Body Splitter
        body_frame = tk.Frame(self.root, bg="#1a1a24")
        body_frame.pack(fill=tk.BOTH, expand=True, padx=10)

        # Left Card: This Device
        left_card = tk.LabelFrame(
            body_frame, 
            text=" Ushbu qurilma (Siz) ", 
            font=("Segoe UI", 10, "bold"), 
            fg="#e3e3e6", 
            bg="#252538", 
            bd=1, 
            relief=tk.FLAT
        )
        left_card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=5)
        
        tk.Label(
            left_card, 
            text="Sizning ID raqamingiz:", 
            font=("Segoe UI", 10), 
            fg="#8c8c9e", 
            bg="#252538"
        ).pack(pady=(15, 5))
        
        self.lbl_my_id = tk.Label(
            left_card, 
            text="--- --- ---", 
            font=("Segoe UI", 18, "bold"), 
            fg="#4ecca3", 
            bg="#252538"
        )
        self.lbl_my_id.pack(pady=5)

        btn_copy = tk.Button(
            left_card, 
            text="ID nusxalash", 
            font=("Segoe UI", 9), 
            command=self.copy_id, 
            bg="#00adb5", 
            fg="white", 
            activebackground="#007f85", 
            activeforeground="white", 
            relief=tk.FLAT, 
            bd=0, 
            padx=10, 
            pady=4
        )
        btn_copy.pack(pady=(10, 5))

        # Right Card: Connect to Peer
        right_card = tk.LabelFrame(
            body_frame, 
            text=" Masofaviy boshqaruv ", 
            font=("Segoe UI", 10, "bold"), 
            fg="#e3e3e6", 
            bg="#252538", 
            bd=1, 
            relief=tk.FLAT
        )
        right_card.pack(side=tk.RIGHT, fill=tk.BOTH, expand=True, padx=10, pady=5)

        tk.Label(
            right_card, 
            text="Hamkor ID raqami (Peer ID):", 
            font=("Segoe UI", 10), 
            fg="#8c8c9e", 
            bg="#252538"
        ).pack(pady=(15, 5))
        
        self.entry_peer_id = tk.Entry(
            right_card, 
            font=("Segoe UI", 12), 
            justify=tk.CENTER, 
            bg="#1a1a24", 
            fg="white", 
            bd=1, 
            relief=tk.FLAT, 
            insertbackground="white"
        )
        self.entry_peer_id.pack(pady=5, padx=20, fill=tk.X)

        self.btn_connect = tk.Button(
            right_card, 
            text="Ulanish (Connect)", 
            font=("Segoe UI", 10, "bold"), 
            command=self.start_connect, 
            bg="#4ecca3", 
            fg="#1a1a24", 
            activebackground="#3cb38d", 
            activeforeground="#1a1a24", 
            relief=tk.FLAT, 
            bd=0, 
            pady=8
        )
        self.btn_connect.pack(pady=(15, 5), padx=20, fill=tk.X)

        # Status log console at the bottom
        self.lbl_status = tk.Label(
            self.root, 
            text="Tizim holati: Signaling serverga ulanmoqda...", 
            font=("Segoe UI", 9), 
            fg="#8c8c9e", 
            bg="#1a1a24", 
            anchor=tk.W, 
            padx=15, 
            pady=8
        )
        self.lbl_status.pack(fill=tk.X)

    def _check_registration(self):
        if self.signaling and self.signaling.assigned_id:
            self.lbl_my_id.config(text=self.signaling.assigned_id)
            self.lbl_status.config(text="Tizim holati: Ulanishga tayyor (Ready)")
        else:
            self.root.after(500, self._check_registration)

    def copy_id(self):
        num_id = self.lbl_my_id.cget("text")
        if num_id != "--- --- ---":
            self.root.clipboard_clear()
            self.root.clipboard_append(num_id)
            messagebox.showinfo("Nusxalandi", f"Sizning ID raqamingiz nusxalandi: {num_id}")

    def start_connect(self):
        peer_id = self.entry_peer_id.get().strip()
        if not peer_id:
            messagebox.showerror("Xato", "Iltimos, ulanmoqchi bo'lgan hamkoringiz ID raqamini kiriting!")
            return
            
        # Sanitize peer ID: format 9-digit input to XXX-XXX-XXX format automatically
        clean_id = peer_id.replace("-", "").replace(" ", "")
        if len(clean_id) == 9 and clean_id.isdigit():
            peer_id = f"{clean_id[:3]}-{clean_id[3:6]}-{clean_id[6:]}"
            
        self.btn_connect.config(state=tk.DISABLED, text="Ulanmoqda...")
        self.lbl_status.config(text=f"Hamkor {peer_id} ga ulanish so'ralmoqda...")
        
        # Schedule connection routine in background async thread
        asyncio.run_coroutine_threadsafe(self._async_connect_flow(peer_id), self.loop)

    async def _async_connect_flow(self, target_id: str):
        try:
            logger.info(f"Initiating connection to peer {target_id}...")
            # Request connection rendezvous via signaling server
            await self.signaling.connect_to_peer(target_id)
        except Exception as e:
            logger.error(f"Error requesting connection flow: {e}")
            self.root.after(0, self._reset_connect_btn, f"Xato: {e}")

    def _reset_connect_btn(self, status_msg: str):
        self.btn_connect.config(state=tk.NORMAL, text="Ulanish (Connect)")
        self.lbl_status.config(text=f"Tizim holati: {status_msg}")

    # Callback when peer sends invitation
    def _on_incoming_invite(self, peer_id: str, endpoints: dict):
        logger.info(f"Incoming invitation from peer {peer_id}.")
        
        def prompt_permission():
            response = messagebox.askyesno(
                "Ulanish so'rovi", 
                f"Foydalanuvchi {peer_id} sizning ekraningizni ko'rish va boshqarishga ruxsat so'ramoqda.\nRuxsat berasizmi?"
            )
            if response:
                import hashlib
                my_id = self.signaling.assigned_id
                session_id = "-".join(sorted([my_id, peer_id]))
                key_hash = hashlib.sha256(session_id.encode('utf-8')).digest()
                b64_key = base64.b64encode(key_hash).decode('utf-8')
                
                self.lbl_status.config(text="Ulanish qabul qilindi. Ekran uzatilmoqda...")
                self._start_session_host(peer_id, endpoints, b64_key)
            else:
                logger.info(f"User rejected connection from peer {peer_id}")
                self.lbl_status.config(text="Ulanish so'rovi rad etildi.")
                
        self.root.after(0, prompt_permission)

    # Callback when initiator receives rendezvous peer info
    def _on_incoming_info(self, peer_id: str, endpoints: dict):
        logger.info(f"Rendezvous info received for peer {peer_id}.")
        # Derive secure key deterministically from sorted assigned IDs
        import hashlib
        my_id = self.signaling.assigned_id
        session_id = "-".join(sorted([my_id, peer_id]))
        key_hash = hashlib.sha256(session_id.encode('utf-8')).digest()
        b64_key = base64.b64encode(key_hash).decode('utf-8')
        
        self.root.after(0, self._start_session_viewer, peer_id, endpoints, b64_key)

    def _on_signaling_error(self, err_msg: str):
        # Reset button and show error message on main thread
        self.root.after(0, self._reset_connect_btn, f"Xato: {err_msg}")

    def _start_session_host(self, peer_id: str, endpoints: dict, b64_key: str):
        """
        Starts the session as the HOST (the device sharing its screen).
        """
        self.lbl_status.config(text="Masofaviy foydalanuvchiga ekran uzatilmoqda...")
        # Start connection manager in background thread
        threading.Thread(target=self._run_host_network_loop, args=(peer_id, endpoints, b64_key), daemon=True).start()

    def _start_session_viewer(self, peer_id: str, endpoints: dict, b64_key: str):
        """
        Starts the session as the VIEWER (the device controlling the remote host).
        """
        self.lbl_status.config(text="Masofaviy ekran qabul qilinmoqda...")
        threading.Thread(target=self._run_viewer_network_loop, args=(peer_id, endpoints, b64_key), daemon=True).start()

    def _run_host_network_loop(self, peer_id: str, endpoints: dict, b64_key: str):
        """
        Screen transmission, input injection, clipboard sync (Host).
        """
        # 1. Initialize local modules
        capturer = ScreenCapturer(width=1280, height=720) # scale down for network speed
        encoder = VideoEncoder(width=1280, height=720, fps=config.DEFAULT_FPS, codec_name='mjpeg')
        injector = InputInjector()
        clipboard = ClipboardManager()
        
        loop = asyncio.new_event_loop()
        
        # Input callback to receive mouse/keyboard
        def on_data_received(data):
            try:
                import json
                msg = json.loads(data.decode('utf-8'))
                if msg.get("type") == "input":
                    injector.inject(msg["event"])
                elif msg.get("type") == "clipboard":
                    clipboard.set_text(msg["text"])
            except Exception as e:
                pass

        manager = ConnectionManager(self.signaling.assigned_id, config.DEFAULT_SIGNAL_SERVER, config.DEFAULT_SIGNAL_PORT, on_data_received)
        self.active_manager = manager
        
        async def run():
            connected = await manager.establish_connection(peer_id, endpoints, b64_key)
            if not connected:
                logger.error("Failed to establish P2P/Relay fallback data link.")
                self.root.after(0, self._reset_connect_btn, "Ulanish muvaffaqiyatsiz bo'ldi")
                return

            self.root.after(0, lambda: self.lbl_status.config(text="Ulandi! Ekran uzatilmoqda."))
            
            # Start Clipboard Poller
            async def clip_loop():
                while manager.active_connection and manager.active_connection.is_connected:
                    new_text = clipboard.check_for_changes()
                    if new_text:
                        import json
                        payload = json.dumps({"type": "clipboard", "text": new_text}).encode('utf-8')
                        manager.send_secure(payload)
                    await asyncio.sleep(1.0)
            
            # Start Screen Capturing / Encoding / Sending
            async def capture_loop():
                interval = 1.0 / config.DEFAULT_FPS
                while manager.active_connection and manager.active_connection.is_connected:
                    start_time = asyncio.get_running_loop().time()
                    frame = capturer.capture()
                    if frame is not None:
                        # Encode
                        packets = encoder.encode(frame)
                        for p in packets:
                            import json
                            payload = json.dumps({"type": "video", "data": base64.b64encode(p).decode('utf-8')}).encode('utf-8')
                            manager.send_secure(payload)
                    elapsed = asyncio.get_running_loop().time() - start_time
                    await asyncio.sleep(max(0.001, interval - elapsed))

            await asyncio.gather(capture_loop(), clip_loop())
            
        try:
            loop.run_until_complete(run())
        finally:
            capturer.close()
            manager.close()
            loop.close()
            self.root.after(0, self._reset_connect_btn, "Sessiya yakunlandi")

    def _run_viewer_network_loop(self, peer_id: str, endpoints: dict, b64_key: str):
        """
        Viewer loop: render screen, capture local keyboard/mouse input, sync clipboard (Viewer).
        """
        decoder = VideoDecoder(codec_name='mjpeg')
        viewer = RemoteViewer(width=1280, height=720)
        clipboard = ClipboardManager()
        
        loop = asyncio.new_event_loop()
        
        # Setup thread-safe queue to push inputs to the async networking loop
        input_queue = asyncio.Queue()

        def on_data_received(data):
            try:
                import json
                msg = json.loads(data.decode('utf-8'))
                if msg.get("type") == "video":
                    raw_bytes = base64.b64decode(msg["data"].encode('utf-8'))
                    frame = decoder.decode(raw_bytes)
                    if frame is not None:
                        viewer.render_frame(frame)
                elif msg.get("type") == "clipboard":
                    clipboard.set_text(msg["text"])
            except Exception as e:
                logger.error(f"Error processing received viewer data: {e}")

        manager = ConnectionManager(self.signaling.assigned_id, config.DEFAULT_SIGNAL_SERVER, config.DEFAULT_SIGNAL_PORT, on_data_received)
        self.active_manager = manager

        async def run():
            connected = await manager.establish_connection(peer_id, endpoints, b64_key)
            if not connected:
                logger.error("Failed to establish P2P/Relay fallback data link.")
                self.root.after(0, self._reset_connect_btn, "Ulanish muvaffaqiyatsiz bo'ldi")
                return

            self.root.after(0, lambda: self.lbl_status.config(text="Ulandi! Ekran qabul qilinmoqda."))
            
            # Start Pygame input monitoring loop
            viewer.start()
            
            # Forward local inputs to Host
            async def input_forwarder():
                while manager.active_connection and manager.active_connection.is_connected:
                    evt = await input_queue.get()
                    import json
                    payload = json.dumps({"type": "input", "event": evt}).encode('utf-8')
                    manager.send_secure(payload)
                    input_queue.task_done()

            # Poll Pygame events
            async def event_poller():
                import pygame
                while manager.active_connection and manager.active_connection.is_connected:
                    # Run pygame event loops
                    events = pygame.event.get()
                    for event in events:
                        if event.type == pygame.QUIT:
                            manager.close()
                            break
                        # Handle input events
                        translated = translate_pygame_event(event, 1280, 720)
                        if translated:
                            await input_queue.put(translated)
                    await asyncio.sleep(0.005)
                viewer.stop()

            # Poll local clipboard changes
            async def clip_loop():
                while manager.active_connection and manager.active_connection.is_connected:
                    new_text = clipboard.check_for_changes()
                    if new_text:
                        import json
                        payload = json.dumps({"type": "clipboard", "text": new_text}).encode('utf-8')
                        manager.send_secure(payload)
                    await asyncio.sleep(1.0)

            await asyncio.gather(input_forwarder(), event_poller(), clip_loop())

        try:
            loop.run_until_complete(run())
        finally:
            viewer.stop()
            manager.close()
            loop.close()
            self.root.after(0, self._reset_connect_btn, "Sessiya yakunlandi")

    def run(self):
        self.root.mainloop()

def main():
    gui = OnlyDeskGUI()
    gui.run()

if __name__ == "__main__":
    main()
