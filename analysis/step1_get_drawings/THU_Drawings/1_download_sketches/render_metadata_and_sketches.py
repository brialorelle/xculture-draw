### Set up libraries
from __future__ import division

import os
import urllib, cStringIO

import numpy as np
import scipy.stats as stats
import pandas as pd
import json
import re

from PIL import Image
import base64
import datetime
import time
import couchdb

auth = pd.read_csv('auth.txt', header = None) 
server_address_input = auth.values[0][0]
couch = couchdb.Server(server_address_input)
db = couch['tsinghua-draw'] 
db.info()

sketch_dir='THU_sketches_and_metadata'
if not os.path.exists(sketch_dir):
    os.makedirs(sketch_dir)


def load_image_data(imgData,imsize):
    filestr = base64.b64decode(imgData)
    fname = os.path.join('sketch.png')
    with open(fname, "wb") as fh:
        fh.write(imgData.decode('base64'))
    im = Image.open(fname).resize((imsize,imsize))
    _im = np.array(im)
    return(_im)

def get_mean_intensity(img,imsize):
    thresh = 250
    numpix = imsize**2
    mean_intensity = len(np.where(img[:,:,3].flatten()>thresh)[0])/numpix
    return mean_intensity
    
def get_bounding_box(img):
    rows = np.any(img, axis=1)
    cols = np.any(img, axis=0)
    rmin, rmax = np.where(rows)[0][[0, -1]]
    cmin, cmax = np.where(cols)[0][[0, -1]]
    bounding_box = tuple((rmin, rmax, cmin, cmax))
    return bounding_box


## img writing parameters
imsize = 224

## desired output: a dataframe that has trials on the rows, and the following columns:
## category, age, number of strokes, mean_pixel_intensity, bounding_box_coordinates_LTRB, list of strokes, 
## PNG string, submission_time, submission_date
## to be saved out as a nice tidy CSV
session_id = []
subid=[]
trial_num = []
category = []
num_strokes = []
mean_intensity = []
bounding_box = []
svg = []
_svg_start_times = []
_svg_end_times = []
png = []
submit_time = []
submit_date = []
draw_duration = []
draw_duration_strokes = []
filename = []
age=[]
condition=[]
readadble_date = []
imsize = 224 ## img writing size, optimized for CNN


### read in valid sessions csv
# subject_log_csv= '/Users/brialong/Documents/GitHub/devphotodraw/data/THU/demographics/final_subject_info.csv'
# subject_log = pd.read_csv(subject_log_csv)
# total_sessions = subject_log['ID_Database']
# count_sub=0

img_recs_selector = {'selector': {'dataType':'finalImage', 'colname':'Tsinghua_photodraw_production', 'trialNum':10}, 'limit':1000} # limit defautls to 25, wow
img_recs_temp = db.find(img_recs_selector)
result = map(lambda x: x['subID'], img_recs_temp)
all_sessions_recorded = np.unique(result)
count_sub=0

for s in all_sessions_recorded:
    count_sub = count_sub + 1
    print 'rendering for {}, gone through {} of {} subs'.format(s, count_sub, np.size(all_sessions_recorded))
    img_recs_selector = {'selector': {'dataType':'finalImage', 'subID': s}}
    img_recs_temp = db.find(img_recs_selector)
    image_recs = sorted(img_recs_temp, key=lambda image: image['endTrialTime'])
    print 'found {} images for {}'.format(np.size(image_recs), s)
    for imrec in image_recs:  
        stroke_recs = {'selector': {'dataType':'stroke','category':imrec['category'], 'subID': s}}
        stroke_recs_temp = db.find(stroke_recs) 
        sorted_stroke_recs = sorted(stroke_recs_temp, key=lambda stroke: stroke['endStrokeTime'])
        stroke_recs = sorted_stroke_recs
        if np.size(stroke_recs) > 0: ## only include trials if the drawings are not blank            
            subid.append(s)
            session_id.append(imrec['sessionId'])        
            trial_num.append(imrec['trialNum']) 
            category.append(imrec['category'])

#                 try:    
            png.append(imrec['imgData'])
            submit_time.append(imrec['endTrialTime'])
            submit_date.append(imrec['date'])
            condition.append(imrec['condition'])
            filename.append(os.path.join(sketch_dir,'{}_sketch_{}_{}.png'.format(imrec['category'], imrec['subID'], imrec['condition'])))
            num_strokes.append(np.size(sorted_stroke_recs))
            draw_duration.append(imrec['endTrialTime'] - imrec['startTrialTime'])

            _svg = [] # this keeps track of the strokes from THIS final image
            _svg_times = []
            _svg_end_times = []
            _svg_start_times = []
            for strec in stroke_recs:
                _svg.append(strec['svg'])
                _svg_end_times.append(strec['endStrokeTime'])
                _svg_start_times.append(strec['startStrokeTime'])
            draw_duration_strokes.append((_svg_end_times[-1] - _svg_start_times[0])/1000) ## in seconds
            
            # get intensity and bounding box coordinates
            this_image = load_image_data(imrec['imgData'],imsize)

            this_intensity = get_mean_intensity(this_image,imsize)
            if this_intensity>0:
                this_bounding_box = get_bounding_box(this_image)
            else:
                this_bounding_box= tuple((0,0,0,0,))
            #
            bounding_box.append(this_bounding_box)
            mean_intensity.append(this_intensity)
            
            ## and write out image data here too
            # imgData = imrec['imgData'];
            # filestr = base64.b64decode(imgData)
            # child_dir = os.path.join(sketch_dir,imrec['subID'])
            # if not os.path.exists(child_dir):
            #     os.makedirs(child_dir)
            # fname = os.path.join(child_dir,'{}_sketch_{}_{}.png'.format(imrec['category'],imrec['subID'],imrec['condition']))
            # with open(fname, "wb") as fh:
            #     fh.write(imgData.decode('base64'))  

            if np.mod(count_sub,10)==0:
                X = pd.DataFrame([session_id, trial_num, condition, category, submit_time,submit_date,num_strokes, png,draw_duration,draw_duration_strokes,bounding_box, mean_intensity, filename])
                X = X.transpose()
                X.columns = ['session_id','trial_num','condition','category','submit_time','submit_date','num_strokes','png','draw_duration', 'draw_duration_strokes','bounding_box','mean_intensity','filename']

                X.to_csv(os.path.join(sketch_dir,'THU_Drawings_AllDescriptives_{}_{}.csv'.format('april2021', count_sub)))  


X = pd.DataFrame([subid, session_id, trial_num, condition, category, submit_time,submit_date,num_strokes, png,draw_duration,draw_duration_strokes,bounding_box, mean_intensity, filename])
X = X.transpose()
X.columns = ['subid','session_id','trial_num','condition','category','submit_time','submit_date','num_strokes','png','draw_duration', 'draw_duration_strokes','bounding_box','mean_intensity','filename']

X.to_csv(os.path.join(sketch_dir,'THU_Drawings_AllDescriptives_{}_all.csv'.format('april2021')))   

    




#               