import numpy as np
import colorsys
from PIL import Image
from keras.models import load_model
from glob import glob
import cv2
import os
from keras import backend as K 
K.clear_session()

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

# using convLSTM_external
def predict(input_imgs, output_name):
    model = load_model('convLSTM_external.h5')
    
    output_dir = './' 
    file_name = output_dir + output_name
    
    if not os.path.isdir(output_dir):
        os.makedirs(output_dir)

    imgs_pred = model.predict(input_imgs)
    imgs_pred = np.argmax(imgs_pred, axis = 3)
    
    
    write_image('%s.png' % output_name, imgs_pred[0])

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

def preprocess ():
    imglist = glob("raddarImg/*.png")
    imglist.sort()
    imglist.reverse()
    
    imgs = []
    for img_name in imglist[-3:]:
        with Image.open(img_name) as f:
            img_crop = np.array(f.crop((1639-4, 1439-4, 1711+4, 1511+4)), dtype = np.uint8)
            img_crop = compensate(img_crop)
            imgs.append(img_crop)
    
    imgs = [imgs]

    return np.array(imgs)

if __name__ == '__main__':
    # TODO: check file_list compelete
    imgs = preprocess()
    predict(imgs, "test")
