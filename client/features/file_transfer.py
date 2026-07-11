import os
import base64
import uuid
import logging
from typing import Dict, Generator, Any

logger = logging.getLogger(__name__)

class FileTransferSender:
    def __init__(self, file_path: str, chunk_size: int = 32768):
        self.file_path = file_path
        self.chunk_size = chunk_size
        self.file_id = str(uuid.uuid4())
        self.filename = os.path.basename(file_path)
        self.total_size = os.path.getsize(file_path)

    def generate_packets(self) -> Generator[Dict[str, Any], None, None]:
        """
        Generates chunked JSON-serializable dictionaries for file transfer.
        """
        logger.info(f"Initiating file transfer for {self.filename} ({self.total_size} bytes). File ID: {self.file_id}")
        
        # 1. Send start packet
        yield {
            "type": "file_start",
            "file_id": self.file_id,
            "filename": self.filename,
            "total_size": self.total_size,
            "chunk_size": self.chunk_size
        }
        
        # 2. Send chunk packets
        try:
            with open(self.file_path, "rb") as f:
                chunk_index = 0
                while True:
                    chunk_data = f.read(self.chunk_size)
                    if not chunk_data:
                        break
                    
                    b64_data = base64.b64encode(chunk_data).decode('utf-8')
                    yield {
                        "type": "file_chunk",
                        "file_id": self.file_id,
                        "chunk_index": chunk_index,
                        "data": b64_data
                    }
                    chunk_index += 1
        except Exception as e:
            logger.error(f"Error reading file for transfer: {e}")
            yield {
                "type": "file_error",
                "file_id": self.file_id,
                "message": str(e)
            }
            return
            
        # 3. Send end packet
        yield {
            "type": "file_end",
            "file_id": self.file_id
        }
        logger.info(f"Finished generating transfer packets for {self.filename}.")


class FileTransferReceiver:
    def __init__(self, download_dir: str = "./downloads"):
        self.download_dir = download_dir
        # Maps file_id -> { "file_handle": file, "filename": str, "total_size": int, "written_size": int }
        self._active_transfers = {}
        
        # Ensure download directory exists
        try:
            os.makedirs(self.download_dir, exist_ok=True)
        except Exception as e:
            logger.error(f"Failed to create download directory {download_dir}: {e}")

    def handle_packet(self, packet: Dict[str, Any]) -> bool:
        """
        Processes an incoming file transfer packet.
        Returns:
            bool: True if file transfer completed, False otherwise.
        """
        msg_type = packet.get("type")
        file_id = packet.get("file_id")
        
        if not file_id:
            return False
            
        try:
            if msg_type == "file_start":
                filename = packet.get("filename")
                total_size = packet.get("total_size", 0)
                
                # Sanitize filename to prevent directory traversal vulnerabilities
                safe_filename = os.path.basename(filename)
                target_path = os.path.join(self.download_dir, safe_filename)
                
                logger.info(f"Starting file reception: {safe_filename} ({total_size} bytes) -> {target_path}")
                f_handle = open(target_path, "wb")
                
                self._active_transfers[file_id] = {
                    "file_handle": f_handle,
                    "filename": safe_filename,
                    "target_path": target_path,
                    "total_size": total_size,
                    "written_size": 0
                }
                
            elif msg_type == "file_chunk":
                transfer = self._active_transfers.get(file_id)
                if not transfer:
                    logger.warning(f"Received chunk for unregistered file ID: {file_id}")
                    return False
                    
                b64_data = packet.get("data", "")
                chunk_index = packet.get("chunk_index", 0)
                chunk_bytes = base64.b64decode(b64_data.encode('utf-8'))
                
                # Write to file
                transfer["file_handle"].write(chunk_bytes)
                transfer["written_size"] += len(chunk_bytes)
                logger.debug(f"Received chunk {chunk_index} for {transfer['filename']} ({len(chunk_bytes)} bytes)")
                
            elif msg_type == "file_end":
                transfer = self._active_transfers.pop(file_id, None)
                if transfer:
                    transfer["file_handle"].close()
                    logger.info(f"File transfer completed successfully: {transfer['filename']} ({transfer['written_size']} bytes saved)")
                    return True
                    
            elif msg_type == "file_error":
                transfer = self._active_transfers.pop(file_id, None)
                if transfer:
                    transfer["file_handle"].close()
                    # Clean up partial file
                    try:
                        os.remove(transfer["target_path"])
                    except:
                        pass
                    logger.error(f"File transfer aborted by remote peer: {packet.get('message')}")
                    
        except Exception as e:
            logger.error(f"Error handling file transfer packet: {e}")
            # Cleanup on error
            transfer = self._active_transfers.pop(file_id, None)
            if transfer:
                try:
                    transfer["file_handle"].close()
                    os.remove(transfer["target_path"])
                except:
                    pass
                    
        return False
