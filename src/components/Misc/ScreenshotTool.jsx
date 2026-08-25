import React, { useState } from 'react';
import html2canvas from 'html2canvas';

const ScreenshotTool = () => {
    const [isTakingScreenshot, setIsTakingScreenshot] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [dragCurrent, setDragCurrent] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = (e) => {
        setDragStart({ x: e.clientX, y: e.clientY });
        setDragCurrent({ x: e.clientX, y: e.clientY });
        setIsDragging(true);
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setDragCurrent({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
        if (!isDragging) return;
        setIsDragging(false);
        setIsTakingScreenshot(false);

        const x = Math.min(dragStart.x, dragCurrent.x);
        const y = Math.min(dragStart.y, dragCurrent.y);
        const width = Math.abs(dragStart.x - dragCurrent.x);
        const height = Math.abs(dragStart.y - dragCurrent.y);

        if (width < 10 || height < 10) return;

        setTimeout(() => {
            html2canvas(document.body).then((fullCanvas) => {
                const croppedCanvas = document.createElement("canvas");
                croppedCanvas.width = width;
                croppedCanvas.height = height;
                const ctx = croppedCanvas.getContext("2d");
                ctx.drawImage(fullCanvas, x, y, width, height, 0, 0, width, height);

                const url = croppedCanvas.toDataURL("image/png");
                const link = document.createElement("a");
                link.download = "rover_screenshot.png";
                link.href = url;
                link.click();
            });
        }, 100);
    };

   
    return (
        <>
        
            <button
                onClick={() => setIsTakingScreenshot(true)}
                style={{
                    fontSize: "12px",
                    padding: "2px 5px",
                    backgroundColor: "var(--button-color)",
                    color: "white",
                    border: "none",
                    borderRadius: "4px",
                    marginRight: "5px",
                    cursor: "pointer"
                }}
            >
                Take Screenshot
            </button>

            
            {isTakingScreenshot && (
                <div
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    style={{
                        position: "fixed",
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: "rgba(0, 0, 0, 0.2)",
                        cursor: "crosshair",
                        zIndex: 99999
                    }}
                >
                    {isDragging && (
                        <div style={{
                            position: "absolute",
                            border: "2px dashed #fff",
                            backgroundColor: "rgba(255, 255, 255, 0.1)",
                            left: Math.min(dragStart.x, dragCurrent.x),
                            top: Math.min(dragStart.y, dragCurrent.y),
                            width: Math.abs(dragStart.x - dragCurrent.x),
                            height: Math.abs(dragStart.y - dragCurrent.y),
                        }} />
                    )}
                </div>
            )}
        </>
    );
};

export default ScreenshotTool;