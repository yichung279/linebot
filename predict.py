#!/usr/bin/env python3
import sys
from datetime import datetime, timedelta
import numpy as np
import colorsys
from PIL import Image, ImageDraw, ImageFont
from keras.models import load_model
from glob import glob
import cv2
import os
from keras import backend as K 
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

#BGR
label2pixel = [
    [  0,   0,   0],
    [  0, 200,   0],
    [  0,   0, 200],
]

color2rgb = {'white' : (  0,   0,   0),
             'blue'  : (  0,   0, 200),
             'green' : (  0, 200,   0),
             'yellow': (200, 250,   0),
             'red'   : (200,   0,   0),
             'purple': (200,   0, 200)}

def write_image(filename, img_cls):
    image = np.zeros((img_cls.shape[0], img_cls.shape[1], 3))
    for i in range(img_cls.shape[0]):
        for j in range(img_cls.shape[1]):
            image[i][j][0] = label2pixel[img_cls[i][j]][0]
            image[i][j][1] = label2pixel[img_cls[i][j]][1]
            image[i][j][2] = label2pixel[img_cls[i][j]][2]

    cv2.imwrite(filename, image)
    return image

# using convLSTM_external
def predict(input_imgs, output_name):
    model = load_model('convLSTM_external.h5')
    
    output_dir = 'output/' 
    file_name = output_dir + output_name

    imgs_cls = model.predict(input_imgs)
    imgs_cls = np.argmax(imgs_cls, axis = 3)
    
    
    img_pred = write_image(file_name, imgs_cls[0])
    
    prob = 0
    for i in range(32, 40):
        for j in range(32, 40):
            prob += imgs_cls[0][i][j]

    K.clear_session()
    if prob > 80 :
        print("raining")
        return True, img_pred
    else :
        print("safe")
        return False, img_pred

def vote(i, j, img):
    color = {'white': 0, 'blue': 0, 'green': 0, 'yellow': 0, 'red': 0, 'purple': 0}

    top = i - 2 if i - 2 >= 0 else 0
    left = j - 2 if j - 2 >= 0 else 0
    bottom = i + 2 if i + 2 < img.shape[0] else img.shape[0] - 1
    right = j + 2 if j + 2 < img.shape[1] else img.shape[1]  - 1

    for m in range(top, bottom + 1):
        for n in range(left, right + 1):
           rgb = [channel/255 for channel in img[m][n]]
           hsv = colorsys.rgb_to_hsv(*rgb)     # hsv = (h, s, v)

           if rgb[0] == rgb[1] and rgb[1] == rgb[2]:     # grayscale
               color['white'] += 1
           elif hsv[0] > 0.95 or hsv[0] < 0.083:
               color['red'] += 1
           elif hsv[0] < 0.194:
               color['yellow'] += 1
           elif hsv[0] < 0.388:
               color['green'] += 1
           elif hsv[0] < 0.722:
               color['blue'] += 1
           elif hsv[0] < 0.95:
               color['purple'] += 1
    
    return color2rgb[max(color, key=color.get)]

def compensate(img):
    for i in range(img.shape[0]):
        for j in range(img.shape[1]):
            if img[i][j][0] == img[i][j][1] and img[i][j][0] == img[i][j][2]:
                img[i][j][0] = 0
                img[i][j][1] = 0
                img[i][j][2] = 0
            
            mx =max(img[i][j])
            mn =min(img[i][j])
            s = 0 if mx == 0 else 1- mn/mx
            
            if mx < 150 and s < 0.3:
                img[i][j] = vote(i, j, img)
    return img

def preprocess (imglist):
    imgs = []
    for img_name in imglist:
        try :
            f = Image.open(img_name)
            img_crop = np.array(f.crop((1639-4, 1439-4, 1711+4, 1511+4)), dtype = np.uint8)
            img_crop = compensate(img_crop)
            imgs.append(img_crop)
        except :
            os.remove(img_name)
            print("open image failed")
            print("nofile") 
            sys.exit()
    
    imgs = [imgs]

    return np.array(imgs)

def get_imglist():
    imglist = glob("radarImg/*.png")
    if sys.argv[1] == "testtrue" :
        imglist = glob("testtest/*.png")
    imglist.sort()
    imglist = imglist[-3:]
     
    if  is_complete(imglist):
        return imglist

    return None

def is_complete(imglist):
    delta = timedelta(seconds = 600)
    
    for i in range(2):
        if datetime.strptime(imglist[i+1][18:30], "%Y%m%d%H%M") - datetime.strptime(imglist[i][18:30], "%Y%m%d%H%M")!= delta:
            return False

    return True

def draw_text_center(draw, text, fontsize, height):
    font = ImageFont.truetype("NotoSansTC-Regular.otf", fontsize)
    w, h = draw.textsize(text, font=font)
    draw.text( ((1040-w)//2, height), text, font=font)
    return draw

def save_all_size(img, path, filename):
    img.save(path + filename + "1040", "png")
    
    size = 700
    img = img.resize((size, size * 900 // 1040), Image.LANCZOS)
    img.save(path + filename + "%d" % size, "png")
    
    size = 460
    img = img.resize((size, size * 900 // 1040), Image.LANCZOS)
    img.save(path + filename + "%d" % size, "png")
    
    size = 300
    img = img.resize((size, size * 900 // 1040), Image.LANCZOS)
    img.save(path + filename + "%d" % size, "png")
    
    size = 240
    img = img.resize((size, size * 900 // 1040), Image.LANCZOS)
    img.save(path + filename + "%d" % size, "png")

def draw(predict, filetime, base_filename):
    predict = predict.astype(np.uint8)
    predict = cv2.cvtColor(predict, cv2.COLOR_BGR2RGB)
    base = np.array(Image.open(base_filename))
    for i in range(1439, 1439+72):
        for j in range(1639, 1639+72):
            if base[i][j][0] != base[i][j][1] or base[i][j][1] != base[i][j][2]:
                if not all(pix == 0 for pix in predict[i-1439][j-1639]):
                    base[i][j] = predict[i-1439][j-1639]
            elif all(pix > 200 for pix in base[i][j]) :
                if not all(pix == 0 for pix in predict[i-1439][j-1639]):
                    base[i][j] = predict[i-1439][j-1639]

    base = Image.fromarray(base)
    base = base.crop((1250,1250, 2290, 1770))
    
    background = Image.new("RGB", (1040, 900), color = (83, 120, 158))
    backgroung = background.paste(base, (0,250))
    
    draw = ImageDraw.Draw(background)
    draw = draw_text_center(draw, "%s預測雲圖" % filetime.strftime("%m/%d %H:%M"), 50, 50)
    draw = draw_text_center(draw, "提醒您，台南市區即將降雨，請做好準備", 30, 150)
    draw = draw_text_center(draw, "點擊前往氣象局網站", 30, 800)
                  
    filename = "notification_%s/" % filetime.strftime("%m%d%H%M")
    path = "Deeprecipitation/"
    if not os.path.isdir(path+filename):
        os.mkdir(path + filename)
    save_all_size(background, path, filename) 
    print(filename)

if __name__ == '__main__':
    imglist = get_imglist() 
    
    if imglist is None:
        print("no complete iamge list")
        print("nofile")
        sys.exit()
    
    imgs = preprocess(imglist)
    filetime = datetime.strptime(imglist[2][18:30], "%Y%m%d%H%M") + timedelta(seconds = 20 * 60)
    filename = "predict_%s.png" % filetime.strftime("%Y%m%d%H%M")
    
    rainy, img = predict(imgs, filename)
    if rainy : draw(img, filetime,imglist[-1])
