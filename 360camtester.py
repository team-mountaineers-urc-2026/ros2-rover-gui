import cv2

url = 'rtsp://admin:daedalus@192.168.1.10/Preview_01_sub'

cap = cv2.VideoCapture(url)

while not cap.isOpened(): pass

while True:
    ret, frame = cap.read()
    if ret:
        cv2.imshow("fisheye", frame)
        if cv2.waitKey(25) == 'q':
            break
    else:
        print('waaaaaaaaaaaaaaaaaaaaah')

cv2.destroyAllWindows()